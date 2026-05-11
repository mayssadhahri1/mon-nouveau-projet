const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const express = require("express");

const app = express();
app.use(express.json()); // Indispensable pour lire le Body JSON de Postman

// --- Configuration gRPC ---
const PROTO_PATH = "../proto/delivery.proto";
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const grpcObject = grpc.loadPackageDefinition(packageDef);
const deliveryPackage = grpcObject.delivery;

// --- Simulation Base de Données (RxDB) ---
let deliveries = [];
let idCounter = 1;

// ==========================================
// 1. ROUTES HTTP (Pour Postman - Port 3000)
// ==========================================

// POST http://localhost:3000/delivery
app.post("/delivery", (req, res) => {
    const { order_id, address } = req.body;
    
    if (!order_id || !address) {
        return res.status(400).json({ error: "order_id et address sont requis" });
    }

    const delivery = {
        id: String(idCounter++),
        order_id: String(order_id),
        address,
        status: "assigned",
    };
    
    deliveries.push(delivery);
    console.log("✅ [HTTP] Livraison créée:", delivery);
    res.status(201).json(delivery);
});

// GET http://localhost:3000/delivery
app.get("/delivery", (req, res) => {
    console.log("✅ [HTTP] Récupération de toutes les livraisons");
    res.json({ deliveries });
});

// Lancement Express
const HTTP_PORT = 3000;
app.listen(HTTP_PORT, () => {
    console.log(`🚀 Serveur HTTP (Postman) : http://localhost:${HTTP_PORT}`);
});


// ==========================================
// 2. LOGIQUE gRPC (Pour Microservices - Port 50052)
// ==========================================

function AssignDelivery(call, callback) {
    const { order_id, address } = call.request;
    const delivery = {
        id: String(idCounter++),
        order_id,
        address,
        status: "assigned",
    };
    deliveries.push(delivery);
    console.log("📦 [gRPC] Delivery assigned:", delivery);
    callback(null, delivery);
}

function GetDeliveries(call, callback) {
    callback(null, { deliveries });
}

// Initialisation du serveur gRPC
const gRPC_PORT = "50052";
const server = new grpc.Server();

server.addService(deliveryPackage.DeliveryService.service, {
    AssignDelivery,
    GetDeliveries,
    // Ajoutez les autres fonctions ici (GetDelivery, UpdateDeliveryStatus)
});

server.bindAsync(
    `0.0.0.0:${gRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`🚚 Service gRPC en cours sur le port ${port}`);
    }
);