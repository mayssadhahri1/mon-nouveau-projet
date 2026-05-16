// ============================================================
// ORDER SERVICE — Service de gestion des commandes
// Ce fichier gère tout ce qui concerne les commandes :
// - créer, voir, modifier, supprimer une commande (via gRPC)
// - publier un message Kafka à chaque création/modification
//   pour que le service livraisons soit averti automatiquement
// - stocker les commandes dans une base de données SQLite
// ============================================================

// --- On importe les outils dont on a besoin ---
const grpc = require("@grpc/grpc-js");            // pour créer le serveur gRPC
const protoLoader = require("@grpc/proto-loader"); // pour lire le fichier .proto (contrat)
const Database = require("better-sqlite3");        // base de données SQLite (fichier local)
const { Kafka } = require("kafkajs");              // pour envoyer des messages Kafka


// ========================
// 1. BASE DE DONNÉES SQLite
// On stocke toutes les commandes dans un fichier local "orders.db"
// ========================

// On ouvre (ou crée) le fichier de base de données
const db = new Database("orders.db");

// On crée la table "orders" si elle n'existe pas encore
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,  -- id auto-incrémenté : 1, 2, 3... (SQLite le gère seul)
        product TEXT,                          -- nom du produit commandé
        quantity INTEGER,                      -- quantité commandée
        status TEXT DEFAULT 'pending'          -- statut par défaut = "en attente"
    )
`);
// AUTOINCREMENT = SQLite génère l'id tout seul, on n'a pas à s'en occuper


// ========================
// 2. KAFKA PRODUCER — envoyer des messages aux autres services
// Kafka = un "bus de messages" entre services
// Ce service est un PRODUCTEUR : il envoie des messages
// Le service livraisons est un CONSOMMATEUR : il les reçoit
// ========================

// Configuration de la connexion Kafka
const kafka = new Kafka({
    clientId: "order-service",  // nom de ce client (pour les logs Kafka)
    brokers: ["localhost:9092"], // adresse du serveur Kafka
});

// On crée un "producer" = un expéditeur de messages
const producer = kafka.producer();

// Fonction pour se connecter à Kafka au démarrage
async function startProducer() {
    try {
        await producer.connect(); // tentative de connexion
        console.log("📡 Kafka Producer connecté");
    } catch (err) {
        // Si Kafka n'est pas lancé, on ne plante pas — on continue sans lui
        console.error("⚠️ Kafka non disponible — on continue sans Kafka:", err.message);
    }
}

// Fonction utilitaire pour envoyer un message sur un topic Kafka
// topic = le "canal" sur lequel on publie (ex: "order-topic")
// message = les données qu'on envoie (objet JavaScript converti en JSON)
async function sendToKafka(topic, message) {
    try {
        await producer.send({
            topic: topic,
            messages: [{ value: JSON.stringify(message) }], // on convertit l'objet en texte JSON
        });
        console.log(`📡 Message envoyé au topic ${topic}:`, message);
    } catch (error) {
        // Si l'envoi échoue, on log l'erreur mais on ne bloque pas le reste
        console.error("⚠️ Erreur envoi Kafka:", error.message);
    }
}


// ========================
// 3. CHARGEMENT DU FICHIER .PROTO
// Le fichier .proto = le contrat entre les services
// Il définit les messages et les fonctions disponibles
// ========================

const packageDef = protoLoader.loadSync("../proto/order.proto", {
    keepCase: true,  // garde les noms de champs tels quels
    longs: String,   // les grands nombres sont traités comme du texte
    enums: String,   // les énumérations aussi
    defaults: true,  // inclut les valeurs par défaut si absentes
    oneofs: true     // gère les champs "un parmi plusieurs"
});

// On extrait le package "order" du proto chargé
const orderPackage = grpc.loadPackageDefinition(packageDef).order;


// ========================
// 4. FONCTIONS gRPC — ce que le service sait faire
// Ces fonctions sont appelées par la Gateway quand elle reçoit une requête
// ========================

// --- Créer une nouvelle commande ---
// Appelée quand on fait POST /orders via la gateway
async function CreateOrder(call, callback) {
    const { product, quantity } = call.request; // données reçues de la gateway
    try {
        // On prépare la requête SQL pour insérer une nouvelle commande
        const stmt = db.prepare(
            "INSERT INTO orders (product, quantity, status) VALUES (?, ?, 'pending')"
        );
        const result = stmt.run(product, quantity); // on exécute l'insertion

        // On construit l'objet commande avec l'id généré automatiquement par SQLite
        const newOrder = {
            id: result.lastInsertRowid, // lastInsertRowid = l'id de la ligne qu'on vient d'insérer
            product,
            quantity,
            status: "pending", // statut initial : en attente
        };

        console.log("✅ Commande créée:", newOrder);

        // On publie la commande sur Kafka → le service livraisons va la recevoir
        // et créer automatiquement une livraison associée
        await sendToKafka("order-topic", newOrder);

        callback(null, newOrder); // on renvoie la commande créée (null = pas d'erreur)
    } catch (err) {
        console.error("❌ Erreur CreateOrder:", err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message }); // erreur serveur
    }
}

// --- Voir une commande par son id ---
// Appelée quand on fait GET /orders/:id via la gateway
function GetOrder(call, callback) {
    try {
        // On cherche la commande dans la base par son identifiant
        const order = db
            .prepare("SELECT * FROM orders WHERE id = ?")
            .get(call.request.id); // .get() renvoie une seule ligne (ou undefined si pas trouvée)

        // Si la commande n'existe pas, on renvoie une erreur 404
        if (!order) {
            return callback({
                code: grpc.status.NOT_FOUND, // code gRPC "introuvable"
                message: "Commande non trouvée",
            });
        }

        callback(null, order); // on renvoie la commande trouvée
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// --- Voir toutes les commandes ---
// Appelée quand on fait GET /orders via la gateway
function GetOrders(call, callback) {
    try {
        // .all() renvoie toutes les lignes de la table sous forme de tableau
        const orders = db.prepare("SELECT * FROM orders").all();

        // On renvoie un objet { orders: [...] } car gRPC attend ce format
        callback(null, { orders });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// --- Modifier le statut d'une commande ---
// Appelée quand on fait PUT /orders/:id via la gateway
async function UpdateOrder(call, callback) {
    const { id, status } = call.request; // id de la commande + nouveau statut
    try {
        // On met à jour le statut dans la base
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);

        // On relit la commande pour vérifier qu'elle existe et avoir ses données complètes
        const order = db
            .prepare("SELECT * FROM orders WHERE id = ?")
            .get(id);

        // Si la commande n'existe pas (l'id était invalide)
        if (!order) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Commande non trouvée",
            });
        }

        // On notifie Kafka que le statut a changé
        // Les autres services pourront réagir à cet événement
        await sendToKafka("order-topic", {
            event: "ORDER_UPDATED", // on ajoute un type d'événement pour que les services sachent quoi faire
            ...order,               // on inclut toutes les données de la commande (spread operator)
        });

        console.log("✅ Commande mise à jour:", order);
        callback(null, order); // on renvoie la commande avec le nouveau statut
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// --- Supprimer une commande ---
// Appelée quand on fait DELETE /orders/:id via la gateway
function DeleteOrder(call, callback) {
    try {
        // On supprime la commande de la base
        db.prepare("DELETE FROM orders WHERE id = ?").run(call.request.id);

        console.log("🗑️ Commande supprimée:", call.request.id);

        // On renvoie un message de confirmation
        // (pas la commande elle-même car elle n'existe plus)
        callback(null, { message: "Order deleted successfully" });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}


// ========================
// 5. DÉMARRAGE DU SERVEUR gRPC
// On crée le serveur, on enregistre les fonctions, et on l'ouvre sur le port 50051
// ========================

// Création du serveur gRPC
const server = new grpc.Server();

// On dit au serveur quelles fonctions il doit exposer
// Le service est défini dans le .proto, les fonctions sont celles d'au-dessus
server.addService(orderPackage.OrderService.service, {
    CreateOrder,  // créer une commande
    GetOrder,     // voir une commande
    GetOrders,    // voir toutes les commandes
    UpdateOrder,  // modifier une commande
    DeleteOrder,  // supprimer une commande
});

// On démarre le serveur sur le port 50051
// 0.0.0.0 = accessible depuis toutes les interfaces réseau (pas seulement localhost)
server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(), // pas de chiffrement (OK pour développement local)
    async (err, port) => {
        if (err) {
            console.error("❌ Erreur démarrage serveur:", err);
            return; // on arrête si ça échoue
        }

        // Une fois le serveur gRPC lancé, on connecte le producer Kafka
        await startProducer();

        console.log(`📦 Order Service en ligne sur le port ${port}`);
    }
);
