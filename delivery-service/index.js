const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { Kafka } = require("kafkajs");

// --- Configuration Kafka (Etape 4) ---
const kafka = new Kafka({ clientId: 'delivery-service', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'delivery-group' });

let deliveries = [];
let idCounter = 1;

// --- Chargement Proto ---
const PROTO_PATH = path.join(__dirname, "../proto/delivery.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true });
const deliveryPackage = grpc.loadPackageDefinition(packageDef).delivery;

// --- LOGIQUE KAFKA : Nour reçoit les messages de Mayssa ---
async function runKafka() {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'order-topic', fromBeginning: true });
        await consumer.run({
            eachMessage: async ({ message }) => {
                const order = JSON.parse(message.value.toString());
                console.log("📥 [Kafka] Nour a reçu la commande de Mayssa :", order.id);
                
                deliveries.push({
                    id: "DEL-" + idCounter++,
                    order_id: String(order.id),
                    address: "Adresse via Kafka",
                    status: "ready_for_pickup",
                });
            },
        });
    } catch (err) {
        console.log("⚠️ Kafka n'est pas lancé, passage en mode gRPC seul.");
    }
}
runKafka();

// --- LOGIQUE gRPC ---
function AssignDelivery(call, callback) {
    const delivery = { id: "DEL-" + idCounter++, ...call.request, status: "assigned" };
    deliveries.push(delivery);
    callback(null, delivery);
}

function GetDeliveries(call, callback) {
    callback(null, { deliveries });
}

const server = new grpc.Server();
server.addService(deliveryPackage.DeliveryService.service, { AssignDelivery, GetDeliveries });
server.bindAsync("0.0.0.0:50052", grpc.ServerCredentials.createInsecure(), () => {
    console.log("🚚 Delivery Service (Nour) prêt sur le port 50052");
});