const express = require("express");
const cors = require("cors");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { ApolloServer, gql } = require("apollo-server-express");

const app = express();

// 1. Configuration indispensable pour React
app.use(cors()); 

const PORT = 3000;
const ORDER_SERVICE_URL = "http://127.0.0.1:3001"; 

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
// ROUTES REST
// ==========================================

// --- 🔐 Authentification (Redirection vers Order-Service) ---
app.post('/auth/register', async (req, res) => {
    try {
        const response = await fetch(`${ORDER_SERVICE_URL}/internal/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Le service des commandes est indisponible." });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const response = await fetch(`${ORDER_SERVICE_URL}/internal/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Le service des commandes est indisponible." });
    }
});

// --- Commandes ---
app.post("/orders", (req, res) => {
    const { product, quantity } = req.body;
    orderClient.CreateOrder({ product, quantity: parseInt(quantity) }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

// 🔄 ROUTE REST CORRIGÉE : Modifie uniquement le STATUT selon le proto de Mayssa
app.put("/orders/:id", (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body; // Le front envoie le nouveau statut ('pending', 'delivered', etc.)

    orderClient.UpdateOrder({ id: parseInt(orderId), status }, (err, response) => {
        if (err) {
            console.error("Erreur gRPC UpdateOrder:", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

app.get("/orders", (req, res) => {
    orderClient.GetOrders({}, (err, response) => {
        if (err) return res.status(500).json([]);
        res.json(response.orders || []);
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
let trackings = []; 

app.post('/track', async (req, res) => {
  try {
    const { order_id } = req.body;

    // 1. SÉCURITÉ : Vérifier si order_id a bien été reçu
    if (!order_id) {
      return res.status(400).json({ error: "L'ID de la commande est manquant." });
    }

    // 2. CRÉATION : Construire l'objet proprement
    const newTracking = {
      id: trackings.length + 1,
      order_id: parseInt(order_id),
      status: "en cours",
      localisation: "En préparation à l'entrepôt" // Évite de laisser vide ou undefined
    };

    // 3. SAUVEGARDE : Ajouter au tableau (ou faire un await MyModel.create(...))
    trackings.push(newTracking);

    // 4. RÉPONSE : Renvoyer l'objet créé avec un statut 201
    return res.status(201).json(newTracking);

  } catch (error) {
    // Si gRPC ou Kafka plante ici, on l'affiche dans le terminal du serveur
    console.error("Le microservice Tracking a crashé :", error);
    return res.status(500).json({ error: "Erreur interne du service de suivi." });
  }
});

app.get('/track', (req, res) => {
  // SÉCURITÉ : Toujours renvoyer un tableau, même s'il est vide
  res.json(trackings || []); 
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
        # 🔄 MUTATION GRAPHQL CORRIGÉE : attend l'id et le status
        updateOrder(id: Int!, status: String!): Order
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
        // 🔄 RESOLVER GRAPHQL CORRIGÉ : Envoie les bons champs à orderClient
        updateOrder: (_, { id, status }) => new Promise((res, rej) => 
            orderClient.UpdateOrder({ id, status }, (err, d) => err ? rej(err) : res(d))),
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