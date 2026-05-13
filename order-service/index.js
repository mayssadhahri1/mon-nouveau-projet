const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const Database = require("better-sqlite3");
const { Kafka } = require("kafkajs");

// ========================
// 1. SQLite Database
// ========================
const db = new Database("orders.db");
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT,
        quantity INTEGER,
        status TEXT DEFAULT 'pending'
    )
`);

// ========================
// 2. Kafka Producer
// ========================
const kafka = new Kafka({
    clientId: "order-service",
    brokers: ["localhost:9092"],
});
const producer = kafka.producer();

async function startProducer() {
    try {
        await producer.connect();
        console.log("📡 Kafka Producer connecté");
    } catch (err) {
        console.error("⚠️ Kafka non disponible — on continue sans Kafka:", err.message);
    }
}

async function sendToKafka(topic, message) {
    try {
        await producer.send({
            topic: topic,
            messages: [{ value: JSON.stringify(message) }],
        });
        console.log(`📡 Message envoyé au topic ${topic}:`, message);
    } catch (error) {
        console.error("⚠️ Erreur envoi Kafka:", error.message);
    }
}

// ========================
// 3. Charger le Proto
// ========================
const packageDef = protoLoader.loadSync("../proto/order.proto", {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const orderPackage = grpc.loadPackageDefinition(packageDef).order;

// ========================
// 4. Implémentation gRPC
// ========================

// Créer une commande
async function CreateOrder(call, callback) {
    const { product, quantity } = call.request;
    try {
        const stmt = db.prepare(
            "INSERT INTO orders (product, quantity, status) VALUES (?, ?, 'pending')"
        );
        const result = stmt.run(product, quantity);

        const newOrder = {
            id: result.lastInsertRowid,
            product,
            quantity,
            status: "pending",
        };

        console.log("✅ Commande créée:", newOrder);

        // 🔥 Envoyer à Kafka → Nour reçoit automatiquement
        await sendToKafka("order-topic", newOrder);

        callback(null, newOrder);
    } catch (err) {
        console.error("❌ Erreur CreateOrder:", err.message);
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// Voir une commande
function GetOrder(call, callback) {
    try {
        const order = db
            .prepare("SELECT * FROM orders WHERE id = ?")
            .get(call.request.id);

        if (!order) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Commande non trouvée",
            });
        }

        callback(null, order);
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// Voir toutes les commandes
function GetOrders(call, callback) {
    try {
        const orders = db.prepare("SELECT * FROM orders").all();
        callback(null, { orders });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// Modifier une commande
async function UpdateOrder(call, callback) {
    const { id, status } = call.request;
    try {
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
        const order = db
            .prepare("SELECT * FROM orders WHERE id = ?")
            .get(id);

        if (!order) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Commande non trouvée",
            });
        }

        // Notifier Kafka que le statut a changé
        await sendToKafka("order-topic", {
            event: "ORDER_UPDATED",
            ...order,
        });

        console.log("✅ Commande mise à jour:", order);
        callback(null, order);
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// Supprimer une commande
function DeleteOrder(call, callback) {
    try {
        db.prepare("DELETE FROM orders WHERE id = ?").run(call.request.id);
        console.log("🗑️ Commande supprimée:", call.request.id);
        callback(null, { message: "Order deleted successfully" });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// ========================
// 5. Démarrage du serveur
// ========================
const server = new grpc.Server();

server.addService(orderPackage.OrderService.service, {
    CreateOrder,
    GetOrder,
    GetOrders,
    UpdateOrder,
    DeleteOrder,
});

server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    async (err, port) => {
        if (err) {
            console.error("❌ Erreur démarrage serveur:", err);
            return;
        }
        await startProducer();
        console.log(`📦 Order Service  running on port ${port}`);
    }
);