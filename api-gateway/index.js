const express = require("express");
const cors = require("cors");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { ApolloServer, gql } = require("apollo-server-express");

const app = express();

// 1. Configuration indispensable pour React
app.use(cors()); 

const PORT = 3000;

const protoOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
};

// 2. Middleware JSON (évite les conflits avec GraphQL)
app.use((req, res, next) => {
    if (req.path === "/graphql") return next();
    express.json()(req, res, next);
});

// ==========================================
// Connexions gRPC (Clients)
// ==========================================
// Utilisation de 127.0.0.1 pour une meilleure stabilité gRPC local
const orderProto = protoLoader.loadSync("../proto/order.proto", protoOptions);
const orderClient = new (grpc.loadPackageDefinition(orderProto).order.OrderService)(
    "127.0.0.1:50051", grpc.credentials.createInsecure()
);

const deliveryProto = protoLoader.loadSync("../proto/delivery.proto", protoOptions);
const deliveryClient = new (grpc.loadPackageDefinition(deliveryProto).delivery.DeliveryService)(
    "127.0.0.1:50052", grpc.credentials.createInsecure()
);

const trackingProto = protoLoader.loadSync("../proto/tracking.proto", protoOptions);
const trackingClient = new (grpc.loadPackageDefinition(trackingProto).tracking.TrackingService)(
    "127.0.0.1:50053", grpc.credentials.createInsecure()
);

// ==========================================
// ROUTES REST (Corrigées pour le Frontend)
// ==========================================

// --- Commandes ---
app.post("/orders", (req, res) => {
    const { product, quantity } = req.body;
    orderClient.CreateOrder({ product, quantity: parseInt(quantity) }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

app.get("/orders", (req, res) => {
    orderClient.GetOrders({}, (err, response) => {
        if (err) return res.status(500).json([]);
        res.json(response.orders || []); // Retourne un tableau vide par défaut
    });
});

// --- Livraisons ---
app.post("/delivery", (req, res) => {
    const { order_id, address } = req.body;
    deliveryClient.AssignDelivery({ order_id: parseInt(order_id), address }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

app.get("/delivery", (req, res) => {
    deliveryClient.GetDeliveries({}, (err, response) => {
        if (err) return res.status(500).json([]);
        res.json(response.deliveries || []);
    });
});

// --- Suivi (Tracking) ---
app.post("/track", (req, res) => {
    const { order_id } = req.body;
    trackingClient.TrackOrder({ order_id: parseInt(order_id) }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

app.get("/track", (req, res) => {
    trackingClient.GetAllTracks({}, (err, response) => {
        if (err) {
            console.error("Erreur gRPC Tracking:", err.message);
            return res.status(500).json([]);
        }
        // CRUCIAL : On renvoie directement le tableau tracks pour le .map() de React
        res.json(response.tracks || []); 
    });
});

// ==========================================
// GRAPHQL
// ==========================================
const typeDefs = gql`
    type Order { id: Int, product: String, quantity: Int, status: String }
    type Delivery { id: String, order_id: Int, address: String, status: String }
    type Track { id: String, order_id: Int, location: String, status: String }

    type Query {
        getOrder(id: Int!): Order
        getOrders: [Order]
        getDelivery(id: String!): Delivery
        getDeliveries: [Delivery]
        getAllTracks: [Track]
    }

    type Mutation {
        createOrder(product: String!, quantity: Int!): Order
        assignDelivery(order_id: Int!, address: String!): Delivery
        trackOrder(order_id: Int!): Track
    }
`;

const resolvers = {
    Query: {
        getOrder: (_, { id }) => new Promise((res, rej) => 
            orderClient.GetOrder({ id }, (err, d) => err ? rej(err) : res(d))),
        getOrders: () => new Promise((res, rej) => 
            orderClient.GetOrders({}, (err, d) => err ? rej(err) : res(d.orders || []))),
        getDelivery: (_, { id }) => new Promise((res, rej) => 
            deliveryClient.GetDelivery({ id }, (err, d) => err ? rej(err) : res(d))),
        getDeliveries: () => new Promise((res, rej) => 
            deliveryClient.GetDeliveries({}, (err, d) => err ? rej(err) : res(d.deliveries || []))),
        getAllTracks: () => new Promise((res, rej) => 
            trackingClient.GetAllTracks({}, (err, d) => err ? rej(err) : res(d.tracks || [])))
    },
    Mutation: {
        createOrder: (_, { product, quantity }) => new Promise((res, rej) => 
            orderClient.CreateOrder({ product, quantity }, (err, d) => err ? rej(err) : res(d))),
        assignDelivery: (_, { order_id, address }) => new Promise((res, rej) => 
            deliveryClient.AssignDelivery({ order_id, address }, (err, d) => err ? rej(err) : res(d))),
        trackOrder: (_, { order_id }) => new Promise((res, rej) => 
            trackingClient.TrackOrder({ order_id }, (err, d) => err ? rej(err) : res(d)))
    }
};

// 3. Lancement du serveur Apollo et Express
async function startServer() {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    server.applyMiddleware({ app });
    
    app.listen(PORT, () => {
        console.log(`✅ Gateway REST en ligne : http://localhost:${PORT}`);
        console.log(`🟣 Gateway GraphQL en ligne : http://localhost:${PORT}/graphql`);
    });
}

startServer().catch(err => console.error("❌ Erreur critique au démarrage :", err));