const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const Database = require("better-sqlite3");
const { Kafka } = require("kafkajs");

// ========================
// 1. SQLite Database
// ========================
const db = new Database("deliveries.db");
db.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,
        order_id INTEGER,
        address TEXT,
        status TEXT DEFAULT 'assigned'
    )
`);

let idCounter = 1;

// Récupérer le prochain ID depuis la DB
function getNextId() {
    const row = db.prepare("SELECT COUNT(*) as count FROM deliveries").get();
    return row.count + 1;
}

// ========================
// 2. Charger le Proto
// ========================
const PROTO_PATH = path.join(__dirname, "../proto/delivery.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const deliveryPackage = grpc.loadPackageDefinition(packageDef).delivery;

// ========================
// 3. Kafka Consumer
// ========================
const kafka = new Kafka({
    clientId: "delivery-service",
    brokers: ["localhost:9092"],
});
const consumer = kafka.consumer({ groupId: "delivery-group" });

async function runKafka() {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: "order-topic", fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ message }) => {
                const order = JSON.parse(message.value.toString());

                // Éviter les doublons : vérifier si une livraison existe déjà pour cette commande
                const existing = db
                    .prepare("SELECT * FROM deliveries WHERE order_id = ? AND id LIKE 'DEL-AUTO-%'")
                    .get(order.id);

                if (existing) {
                    console.log("⚠️ Livraison auto déjà existante pour commande:", order.id);
                    return;
                }

                console.log("📥 [Kafka] Commande reçue de Mayssa n°:", order.id);

                const autoId = "DEL-AUTO-" + getNextId();
                const autoDelivery = {
                    id: autoId,
                    order_id: order.id,
                    address: "En attente d'adresse (via Kafka)",
                    status: "ready_for_pickup",
                };

                db.prepare(
                    "INSERT OR IGNORE INTO deliveries (id, order_id, address, status) VALUES (?, ?, ?, ?)"
                ).run(autoDelivery.id, autoDelivery.order_id, autoDelivery.address, autoDelivery.status);

                console.log("✅ Livraison auto créée et persistée:", autoDelivery.id);
            },
        });
    } catch (err) {
        console.log("⚠️ Kafka non détecté — mode gRPC seul:", err.message);
    }
}

// ========================
// 4. Implémentation gRPC
// ========================

// Assigner une livraison manuellement
function AssignDelivery(call, callback) {
    const { order_id, address } = call.request;
    const id = "DEL-" + getNextId();
    const delivery = {
        id,
        order_id,
        address: address || "Adresse non fournie",
        status: "assigned",
    };

    db.prepare(
        "INSERT INTO deliveries (id, order_id, address, status) VALUES (?, ?, ?, ?)"
    ).run(delivery.id, delivery.order_id, delivery.address, delivery.status);

    console.log("📦 [gRPC] Livraison assignée et persistée:", delivery.id);
    callback(null, delivery);
}

// Voir une livraison
function GetDelivery(call, callback) {
    const delivery = db
        .prepare("SELECT * FROM deliveries WHERE id = ?")
        .get(call.request.id);

    if (!delivery) {
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Livraison non trouvée",
        });
    }
    callback(null, delivery);
}

// Voir toutes les livraisons
function GetDeliveries(call, callback) {
    const deliveries = db.prepare("SELECT * FROM deliveries").all();
    console.log("📊 [gRPC] Liste livraisons — Total:", deliveries.length);
    callback(null, { deliveries });
}

// Modifier le statut d'une livraison
function UpdateDeliveryStatus(call, callback) {
    const { id, status } = call.request;
    const existing = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(id);

    if (!existing) {
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Livraison non trouvée",
        });
    }

    db.prepare("UPDATE deliveries SET status = ? WHERE id = ?").run(status, id);
    const updated = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(id);

    console.log("✅ [gRPC] Statut mis à jour:", id, "->", status);
    callback(null, updated);
}

// ========================
// 5. Démarrage du serveur
// ========================
const server = new grpc.Server();

server.addService(deliveryPackage.DeliveryService.service, {
    AssignDelivery,
    GetDelivery,
    GetDeliveries,
    UpdateDeliveryStatus,
});

server.bindAsync(
    "0.0.0.0:50052",
    grpc.ServerCredentials.createInsecure(),
    async (err, port) => {
        if (err) {
            console.error("❌ Erreur démarrage:", err);
            return;
        }
        console.log(`🚚 Delivery Service en ligne sur le port ${port}`);
        console.log(`💾 Base de données SQLite: deliveries.db`);
        await runKafka();
    }
);