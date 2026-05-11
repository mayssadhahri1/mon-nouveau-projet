const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { Kafka } = require("kafkajs");

// --- 1. CONFIGURATION KAFKA (Nour écoute Mayssa) ---
const kafka = new Kafka({ 
    clientId: 'delivery-service', 
    brokers: ['localhost:9092'] 
});
const consumer = kafka.consumer({ groupId: 'delivery-group' });

// Base de données temporaire en mémoire
let deliveries = [];
let idCounter = 1;

// --- 2. CHARGEMENT DU FICHIER PROTO ---
const PROTO_PATH = path.join(__dirname, "../proto/delivery.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const deliveryPackage = grpc.loadPackageDefinition(packageDef).delivery;

// --- 3. LOGIQUE KAFKA (Réception automatique) ---
async function runKafka() {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'order-topic', fromBeginning: true });
        
        await consumer.run({
            eachMessage: async ({ message }) => {
                const order = JSON.parse(message.value.toString());
                console.log("📥 [Kafka] Message reçu ! Commande de Mayssa n°:", order.id);
                
                // Création automatique d'une livraison suite au message Kafka
                const autoDelivery = {
                    id: "DEL-AUTO-" + idCounter++,
                    order_id: String(order.id),
                    address: "En attente d'adresse (via Kafka)",
                    status: "ready_for_pickup",
                };
                deliveries.push(autoDelivery);
                console.log("✅ Livraison auto créée en mémoire.");
            },
        });
    } catch (err) {
        console.log("⚠️ Kafka n'est pas détecté. Le service fonctionne en mode gRPC seul.");
    }
}

// Lancer le consumer Kafka
runKafka().catch(console.error);

// --- 4. LOGIQUE gRPC (Réponse à la Gateway) ---

/**
 * AssignDelivery: Création manuelle d'une livraison (via Postman/UI)
 */
function AssignDelivery(call, callback) {
    const { order_id, address } = call.request;
    const delivery = {
        id: "DEL-" + idCounter++,
        order_id: String(order_id),
        address: address || "Adresse non fournie",
        status: "assigned",
    };
    deliveries.push(delivery);
    console.log("📦 [gRPC] Livraison assignée manuellement:", delivery.id);
    callback(null, delivery);
}

/**
 * GetDeliveries: Renvoie la liste complète des livraisons à l'interface
 */
function GetDeliveries(call, callback) {
    console.log("📊 [gRPC] Envoi de la liste des livraisons (Total: " + deliveries.length + ")");
    callback(null, { deliveries });
}

// --- 5. DÉMARRAGE DU SERVEUR gRPC ---
const server = new grpc.Server();
server.addService(deliveryPackage.DeliveryService.service, {
    AssignDelivery,
    GetDeliveries,
});

const PORT = "50052";
server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error("❌ Erreur de démarrage gRPC:", err);
            return;
        }
        console.log(`🚚 Delivery Service (Nour) en ligne sur le port ${port}`);
    }
);