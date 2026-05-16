// ============================================================
// DELIVERY SERVICE — Service de gestion des livraisons
// Ce fichier gère tout ce qui concerne les livraisons :
// - créer une livraison manuellement (via gRPC)
// - créer une livraison automatiquement quand une commande arrive (via Kafka)
// - stocker les livraisons dans une base de données SQLite
// ============================================================

// --- On importe les outils dont on a besoin ---
const grpc = require("@grpc/grpc-js");            // pour créer le serveur gRPC
const protoLoader = require("@grpc/proto-loader"); // pour lire le fichier .proto (contrat)
const path = require("path");                      // pour construire les chemins de fichiers
const Database = require("better-sqlite3");        // base de données SQLite (simple fichier local)
const { Kafka } = require("kafkajs");              // pour écouter les messages Kafka (bus de messages)


// ========================
// 1. BASE DE DONNÉES SQLite
// SQLite = une base de données stockée dans un simple fichier .db
// Pas besoin d'installer un serveur, c'est très simple
// ========================

// On ouvre (ou crée) le fichier de base de données
const db = new Database("deliveries.db");

// On crée la table "deliveries" si elle n'existe pas encore
// C'est comme créer un tableau Excel avec ses colonnes
db.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,    -- identifiant unique de la livraison (ex: "DEL-1")
        order_id INTEGER,       -- identifiant de la commande liée
        address TEXT,           -- adresse de livraison
        status TEXT DEFAULT 'assigned'  -- statut par défaut = "assigned" (assignée)
    )
`);

// Fonction utilitaire : compte combien de livraisons existent et génère le prochain numéro
// Exemple : si on a 3 livraisons, le prochain id sera 4
function getNextId() {
    const row = db.prepare("SELECT COUNT(*) as count FROM deliveries").get();
    return row.count + 1; // on ajoute 1 pour avoir le prochain numéro disponible
}


// ========================
// 2. CHARGEMENT DU FICHIER .PROTO
// Le fichier .proto = le contrat entre les services
// Il dit : "voilà les messages qu'on peut s'envoyer"
// ========================

// On construit le chemin vers le fichier proto
const PROTO_PATH = path.join(__dirname, "../proto/delivery.proto");

// On lit et charge le fichier proto avec ses options
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,  // garde les noms de champs tels quels
    longs: String,   // les grands nombres sont traités comme du texte
    enums: String,   // les énumérations aussi
    defaults: true,  // inclut les valeurs par défaut si absentes
    oneofs: true     // gère les champs "un parmi plusieurs"
});

// On extrait le package "delivery" du proto chargé
const deliveryPackage = grpc.loadPackageDefinition(packageDef).delivery;


// ========================
// 3. KAFKA CONSUMER — écouter les nouvelles commandes
// Kafka = un "bus de messages" entre services
// Quand une commande est créée, elle publie un message sur Kafka
// Ce service l'écoute et crée automatiquement une livraison
// ========================

// Configuration de la connexion Kafka
const kafka = new Kafka({
    clientId: "delivery-service",  // nom de ce client (pour les logs Kafka)
    brokers: ["localhost:9092"],   // adresse du serveur Kafka
});

// On crée un "consumer" = un écouteur de messages
const consumer = kafka.consumer({ groupId: "delivery-group" });
// groupId = le groupe de consommateurs (Kafka distribue les messages entre membres du groupe)

async function runKafka() {
    try {
        await consumer.connect(); // on se connecte au serveur Kafka

        // On s'abonne au topic "order-topic"
        // fromBeginning: true = on lit tous les messages depuis le début, pas seulement les nouveaux
        await consumer.subscribe({ topic: "order-topic", fromBeginning: true });

        // Pour chaque message reçu sur ce topic...
        await consumer.run({
            eachMessage: async ({ message }) => {

                // On convertit le message (buffer binaire) en objet JavaScript
                const order = JSON.parse(message.value.toString());

                // On vérifie si une livraison automatique existe déjà pour cette commande
                // (pour éviter de créer des doublons si on redémarre le service)
                const existing = db
                    .prepare("SELECT * FROM deliveries WHERE order_id = ? AND id LIKE 'DEL-AUTO-%'")
                    .get(order.id);

                if (existing) {
                    // Si elle existe déjà, on ne fait rien
                    console.log("⚠️ Livraison auto déjà existante pour commande:", order.id);
                    return;
                }

                console.log("📥 [Kafka] Commande reçue de Mayssa n°:", order.id);

                // On génère un identifiant unique pour la livraison automatique
                const autoId = "DEL-AUTO-" + getNextId(); // ex: "DEL-AUTO-5"

                // On prépare l'objet livraison à insérer en base
                const autoDelivery = {
                    id: autoId,
                    order_id: order.id,
                    address: "En attente d'adresse (via Kafka)", // adresse provisoire
                    status: "ready_for_pickup", // statut : prête à être récupérée
                };

                // On insère la livraison dans la base de données SQLite
                // INSERT OR IGNORE = si l'id existe déjà, on ne fait rien (pas d'erreur)
                db.prepare(
                    "INSERT OR IGNORE INTO deliveries (id, order_id, address, status) VALUES (?, ?, ?, ?)"
                ).run(autoDelivery.id, autoDelivery.order_id, autoDelivery.address, autoDelivery.status);

                console.log("✅ Livraison auto créée et persistée:", autoDelivery.id);
            },
        });

    } catch (err) {
        // Si Kafka n'est pas lancé, on ne plante pas — on continue quand même en mode gRPC seul
        console.log("⚠️ Kafka non détecté — mode gRPC seul:", err.message);
    }
}


// ========================
// 4. FONCTIONS gRPC — ce que le service sait faire
// Ces fonctions sont appelées par la Gateway quand elle reçoit une requête
// ========================

// --- Créer une livraison manuellement ---
// Appelée quand on fait POST /delivery via la gateway
function AssignDelivery(call, callback) {
    const { order_id, address } = call.request; // on récupère les données de la requête gRPC

    // On génère un id unique : "DEL-1", "DEL-2", etc.
    const id = "DEL-" + getNextId();

    // On prépare l'objet livraison
    const delivery = {
        id,
        order_id,
        address: address || "Adresse non fournie", // valeur par défaut si adresse manquante
        status: "assigned", // statut initial = assignée
    };

    // On sauvegarde en base de données
    db.prepare(
        "INSERT INTO deliveries (id, order_id, address, status) VALUES (?, ?, ?, ?)"
    ).run(delivery.id, delivery.order_id, delivery.address, delivery.status);

    console.log("📦 [gRPC] Livraison assignée et persistée:", delivery.id);
    callback(null, delivery); // on renvoie la livraison créée (null = pas d'erreur)
}

// --- Voir une livraison par son id ---
// Appelée quand on fait GET /delivery/:id via la gateway
function GetDelivery(call, callback) {
    // On cherche la livraison dans la base par son identifiant
    const delivery = db
        .prepare("SELECT * FROM deliveries WHERE id = ?")
        .get(call.request.id);

    // Si la livraison n'existe pas, on renvoie une erreur 404
    if (!delivery) {
        return callback({
            code: grpc.status.NOT_FOUND,  // code d'erreur gRPC "introuvable"
            message: "Livraison non trouvée",
        });
    }

    callback(null, delivery); // on renvoie la livraison trouvée
}

// --- Voir toutes les livraisons ---
// Appelée quand on fait GET /delivery via la gateway
function GetDeliveries(call, callback) {
    // On récupère toutes les lignes de la table deliveries
    const deliveries = db.prepare("SELECT * FROM deliveries").all();

    console.log("📊 [gRPC] Liste livraisons — Total:", deliveries.length);

    // On renvoie un objet avec le tableau de livraisons
    // (GraphQL et gRPC attendent { deliveries: [...] } et non juste [...])
    callback(null, { deliveries });
}

// --- Modifier le statut d'une livraison ---
// Appelée quand on fait PUT /delivery/:id via la gateway
function UpdateDeliveryStatus(call, callback) {
    const { id, status } = call.request; // id de la livraison + nouveau statut

    // On vérifie d'abord que la livraison existe
    const existing = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(id);

    if (!existing) {
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Livraison non trouvée",
        });
    }

    // On met à jour le statut dans la base
    db.prepare("UPDATE deliveries SET status = ? WHERE id = ?").run(status, id);

    // On relit la livraison mise à jour pour la renvoyer complète
    const updated = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(id);

    console.log("✅ [gRPC] Statut mis à jour:", id, "->", status);
    callback(null, updated); // on renvoie la livraison avec son nouveau statut
}


// ========================
// 5. DÉMARRAGE DU SERVEUR gRPC
// On crée le serveur, on lui enregistre les fonctions, et on l'ouvre
// ========================

// Création du serveur gRPC
const server = new grpc.Server();

// On dit au serveur : "voilà les fonctions que tu dois exposer"
// Le service est défini dans le .proto, les fonctions sont celles d'au-dessus
server.addService(deliveryPackage.DeliveryService.service, {
    AssignDelivery,       // créer une livraison
    GetDelivery,          // voir une livraison
    GetDeliveries,        // voir toutes les livraisons
    UpdateDeliveryStatus, // modifier le statut
});

// On démarre le serveur sur le port 50052
// 0.0.0.0 = accessible depuis toutes les interfaces réseau (pas seulement localhost)
server.bindAsync(
    "0.0.0.0:50052",
    grpc.ServerCredentials.createInsecure(), // pas de chiffrement (OK pour dev local)
    async (err, port) => {
        if (err) {
            console.error("❌ Erreur démarrage:", err);
            return; // on arrête si le démarrage échoue
        }
        console.log(`🚚 Delivery Service en ligne sur le port ${port}`);
        console.log(`💾 Base de données SQLite: deliveries.db`);

        // Une fois le serveur gRPC lancé, on démarre aussi l'écoute Kafka
        await runKafka();
    }
);
