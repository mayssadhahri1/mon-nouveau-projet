const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const Database = require("better-sqlite3");
const { Kafka } = require("kafkajs"); // Import Kafka

// 1. Initialisation SQLite
const db = new Database("orders.db");
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT,
        quantity INTEGER,
        status TEXT DEFAULT 'pending'
    )
`);

// 2. Configuration Kafka (Mayssa - Producer)
const kafka = new Kafka({
    clientId: 'order-service',
    brokers: ['localhost:9092'] // Assure-toi que ton broker Kafka est lancé
});
const producer = kafka.producer();

// Fonction pour envoyer un événement à Kafka
async function sendToKafka(topic, message) {
    try {
        await producer.connect();
        await producer.send({
            topic: topic,
            messages: [{ value: JSON.stringify(message) }],
        });
        console.log(`📡 Message envoyé au topic ${topic}`);
    } catch (error) {
        console.error("❌ Erreur Kafka Producer:", error);
    } finally {
        await producer.disconnect();
    }
}

// 3. Charger le fichier Proto
const packageDef = protoLoader.loadSync("../proto/order.proto", {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const orderPackage = grpc.loadPackageDefinition(packageDef).order;

// ========================
// Implémentation gRPC
// ========================

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

        console.log("✅ Commande créée en DB:", newOrder);

        // 🔥 ÉTAPE 4 : Envoyer l'événement à Nour (Delivery Service) via Kafka
        await sendToKafka('order-topic', newOrder);

        callback(null, newOrder);
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

function GetOrder(call, callback) {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(call.request.id);
    if (!order) return callback({ code: grpc.status.NOT_FOUND, message: "Order not found" });
    callback(null, order);
}

function GetOrders(call, callback) {
    const orders = db.prepare("SELECT * FROM orders").all();
    callback(null, { orders });
}

function UpdateOrder(call, callback) {
    const { id, status } = call.request;
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    callback(null, order);
}

function DeleteOrder(call, callback) {
    db.prepare("DELETE FROM orders WHERE id = ?").run(call.request.id);
    callback(null, { message: "Order deleted successfully" });
}

// ========================
// Démarrage du serveur
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
    (err, port) => {
        if (err) return console.error(err);
        console.log(`📦 Order Service running on port ${port}`);
    }
);