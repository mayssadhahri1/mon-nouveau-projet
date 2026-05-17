const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { Kafka } = require("kafkajs");
const Database = require("better-sqlite3");

// Connexion / Création de la base de données
const db = new Database("tracking.db");

// Création de la table de suivi (tracks)
db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        order_id INTEGER,
        location TEXT DEFAULT 'Entrepôt central',
        status TEXT DEFAULT 'en cours'
    )
`);

// Fonction utilitaire pour incrémenter l'ID de suivi (ex: TRK-1, TRK-2...)
function getNextId() {
    const row = db.prepare("SELECT COUNT(*) as count FROM tracks").get();
    return row.count + 1;
}

// Chargement du fichier Protocol Buffers (.proto)
const PROTO_PATH = path.join(__dirname, "../proto/tracking.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const trackingPackage = grpc.loadPackageDefinition(packageDef).tracking;


// ============================================================
// ✅ KAFKA CONSUMER — Écoute les nouvelles commandes
// et crée automatiquement un suivi pour chacune
// ============================================================

// Création connexion Kafka
const kafka = new Kafka({
    // Nom du client Kafka
    clientId: "tracking-service",
    // Adresse broker Kafka
    brokers: ["localhost:9092"],
});

// Consumer = écouteur de messages
const consumer = kafka.consumer({
    // Groupe consommateurs Kafka (différent de delivery-group)
    groupId: "tracking-group"
});

// Cette fonction écoute le topic order-topic et crée un suivi automatiquement
async function runKafka() {
    try {
        // Connexion au broker Kafka
        await consumer.connect();
        console.log("📡 [Kafka] Tracking consumer connecté");

        // Abonnement au même topic que le Delivery Service
        await consumer.subscribe({
            topic: "order-topic",
            fromBeginning: true
        });

        // Démarrage écoute messages
        await consumer.run({
            // Fonction exécutée à chaque message reçu
            eachMessage: async ({ message }) => {
                // Décodage du message JSON
                const order = JSON.parse(message.value.toString());

                // On ignore les événements de mise à jour (ORDER_UPDATED)
                // On ne traite que les créations de commande (pas d'événement = nouvelle commande)
                if (order.event === "ORDER_UPDATED") {
                    console.log(
                        "ℹ️  [Kafka] Événement ORDER_UPDATED ignoré pour commande:",
                        order.id
                    );
                    return;
                }

                // Vérifie si un suivi automatique existe déjà pour cette commande
                const existing = db
                    .prepare(
                        `SELECT * FROM tracks
                         WHERE order_id = ?
                         AND id LIKE 'TRK-AUTO-%'`
                    )
                    .get(order.id);

                // Suivi déjà créé → on ne crée pas de doublon
                if (existing) {
                    console.log(
                        "⚠️  [Kafka] Suivi auto déjà existant pour commande:",
                        order.id
                    );
                    return;
                }

                console.log(
                    "📥 [Kafka] Nouvelle commande reçue, création suivi automatique:",
                    order.id
                );

                // Génération de l'ID suivi automatique
                const autoId = "TRK-AUTO-" + getNextId();

                // Objet suivi créé automatiquement
                const autoTrack = {
                    id: autoId,
                    order_id: order.id,
                    location: "Entrepôt central",   // Position initiale par défaut
                    status: "en cours",              // Statut initial
                };

                // Insertion en base SQLite
                db.prepare(`
                    INSERT OR IGNORE INTO tracks
                    (id, order_id, location, status)
                    VALUES (?, ?, ?, ?)
                `).run(
                    autoTrack.id,
                    autoTrack.order_id,
                    autoTrack.location,
                    autoTrack.status
                );

                console.log(
                    "✅ [Kafka] Suivi auto créé:",
                    autoTrack.id,
                    "pour commande #" + order.id
                );
            },
        });

    } catch (err) {
        // Kafka facultatif : si non disponible, le service gRPC fonctionne quand même
        console.log(
            "⚠️  [Kafka] Non détecté, le service continue sans consumer:",
            err.message
        );
    }
}


// ============================================================
// MÉTHODES gRPC
// ============================================================

// 1. TrackOrder — Créer un suivi manuellement via gRPC
function TrackOrder(call, callback) {
    const { order_id } = call.request;
    const id = "TRK-" + getNextId();

    const track = {
        id,
        order_id,
        location: "Entrepôt central",
        status: "en cours",
    };

    db.prepare(`
        INSERT INTO tracks (id, order_id, location, status)
        VALUES (?, ?, ?, ?)
    `).run(track.id, track.order_id, track.location, track.status);

    console.log("📍 [gRPC] Suivi créé pour commande :", order_id);
    callback(null, track);
}

// 2. GetAllTracks — Récupérer tous les suivis
function GetAllTracks(call, callback) {
    const tracks = db.prepare("SELECT * FROM tracks").all();
    console.log("📍 [gRPC] Nombre total de suivis :", tracks.length);
    callback(null, { tracks });
}

// 3. UpdateLocation — Mettre à jour la position et le statut d'un suivi
function UpdateLocation(call, callback) {
    const { id, location, status } = call.request;

    // Vérification existence du suivi
    const existing = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id);

    if (!existing) {
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Suivi non trouvé",
        });
    }

    // Mise à jour SQLite
    db.prepare(`
        UPDATE tracks
        SET location = ?, status = ?
        WHERE id = ?
    `).run(
        location,
        // Garde l'ancien statut si aucun nouveau statut fourni
        status || existing.status,
        id
    );

    // Relecture pour retourner les données à jour
    const updated = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id);

    console.log("✅ [gRPC] Position mise à jour pour :", id, "->", location);
    callback(null, updated);
}


// ============================================================
// DÉMARRAGE DU SERVEUR gRPC
// ============================================================

const server = new grpc.Server();

// Enregistrement des méthodes gRPC
server.addService(trackingPackage.TrackingService.service, {
    TrackOrder,
    GetAllTracks,
    UpdateLocation,
});

server.bindAsync(
    "0.0.0.0:50053",
    grpc.ServerCredentials.createInsecure(),
    // Callback exécuté au démarrage
    async (err, port) => {
        if (err) {
            console.error("❌ Erreur de démarrage du serveur :", err);
            return;
        }
        console.log(`📍 Tracking Service actif sur le port ${port}`);
        console.log(`💾 Base de données SQLite connectée : tracking.db`);

        // ✅ Démarrage du consumer Kafka après le serveur gRPC
        await runKafka();
    }
);