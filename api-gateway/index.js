const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { ApolloServer, gql } = require("apollo-server-express");

const app = express();
const PORT = 3000;

// Options communes pour le chargement des protos
const protoOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
};

// Middleware pour gérer le JSON sans casser le playground GraphQL
app.use((req, res, next) => {
    if (req.path === "/graphql") return next();
    express.json()(req, res, next);
});

<<<<<<< HEAD
// ========================
// gRPC — connexion order-service
// ========================
const packageDefOrder = protoLoader.loadSync("../proto/order.proto");
const grpcObjectOrder = grpc.loadPackageDefinition(packageDefOrder);
const orderPackage = grpcObjectOrder.order;
=======
// ==========================================
// Connexions gRPC (Clients)
// ==========================================
>>>>>>> mayssa

const orderProto = protoLoader.loadSync("../proto/order.proto", protoOptions);
const orderClient = new (grpc.loadPackageDefinition(orderProto).order.OrderService)(
    "localhost:50051", grpc.credentials.createInsecure()
);

<<<<<<< HEAD
// ========================
// gRPC — connexion delivery-service
// ========================
const packageDefDelivery = protoLoader.loadSync("../proto/delivery.proto");
const grpcObjectDelivery = grpc.loadPackageDefinition(packageDefDelivery);
const deliveryPackage = grpcObjectDelivery.delivery;

const deliveryClient = new deliveryPackage.DeliveryService(
    "localhost:50052",
    grpc.credentials.createInsecure()
);

// ========================
// gRPC — connexion tracking-service
// ========================
const packageDefTracking = protoLoader.loadSync("../proto/tracking.proto");
const grpcObjectTracking = grpc.loadPackageDefinition(packageDefTracking);
const trackingPackage = grpcObjectTracking.tracking;

const trackingClient = new trackingPackage.TrackingService(
    "localhost:50053",
    grpc.credentials.createInsecure()
);

// ========================
// REST — Orders
// ========================

// POST /orders → créer une commande
=======
const deliveryProto = protoLoader.loadSync("../proto/delivery.proto", protoOptions);
const deliveryClient = new (grpc.loadPackageDefinition(deliveryProto).delivery.DeliveryService)(
    "localhost:50052", grpc.credentials.createInsecure()
);

const trackingProto = protoLoader.loadSync("../proto/tracking.proto", protoOptions);
const trackingClient = new (grpc.loadPackageDefinition(trackingProto).tracking.TrackingService)(
    "localhost:50053", grpc.credentials.createInsecure()
);

// ==========================================
// ROUTES REST (Pour Postman)
// ==========================================

// --- Orders ---
>>>>>>> mayssa
app.post("/orders", (req, res) => {
    const { product, quantity } = req.body;
    orderClient.CreateOrder({ product, quantity: parseInt(quantity) }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

// GET /orders → voir toutes les commandes
app.get("/orders", (req, res) => {
    orderClient.GetOrders({}, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response.orders || []);
    });
});

// GET /orders/:id → voir une commande
app.get("/orders/:id", (req, res) => {
    orderClient.GetOrder({ id: parseInt(req.params.id) }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

<<<<<<< HEAD
// PUT /orders/:id → modifier une commande
app.put("/orders/:id", (req, res) => {
    const { status } = req.body;
    orderClient.UpdateOrder(
        { id: parseInt(req.params.id), status },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response);
        }
    );
});

// DELETE /orders/:id → supprimer une commande
app.delete("/orders/:id", (req, res) => {
    orderClient.DeleteOrder({ id: parseInt(req.params.id) }, (err, response) => {
=======
// --- Delivery ---
app.post("/delivery", (req, res) => {
    const { order_id, address } = req.body;
    deliveryClient.AssignDelivery({ order_id: parseInt(order_id), address }, (err, response) => {
>>>>>>> mayssa
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

<<<<<<< HEAD
// ========================
// REST — Delivery
// ========================

// POST /delivery → assigner une livraison
app.post("/delivery", (req, res) => {
    const { order_id, address } = req.body;
    deliveryClient.AssignDelivery({ order_id, address }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

// GET /delivery → voir toutes les livraisons
app.get("/delivery", (req, res) => {
    deliveryClient.GetDeliveries({}, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response.deliveries);
    });
});

// GET /delivery/:id → voir une livraison
app.get("/delivery/:id", (req, res) => {
    deliveryClient.GetDelivery({ id: req.params.id }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

// PUT /delivery/:id → modifier le statut
app.put("/delivery/:id", (req, res) => {
    const { status } = req.body;
    deliveryClient.UpdateDeliveryStatus(
        { id: req.params.id, status },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response);
        }
    );
});

// ========================
// REST — Tracking
// ========================

// POST /track → suivre une commande
app.post("/track", (req, res) => {
    const { order_id } = req.body;
    trackingClient.TrackOrder({ order_id }, (err, response) => {
=======
app.get("/delivery", (req, res) => {
    deliveryClient.GetDeliveries({}, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response.deliveries || []);
    });
});

// --- Tracking ---
app.post("/track", (req, res) => {
    const { order_id } = req.body;
    trackingClient.TrackOrder({ order_id: parseInt(order_id) }, (err, response) => {
>>>>>>> mayssa
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

<<<<<<< HEAD
// GET /track → voir tous les suivis
app.get("/track", (req, res) => {
    trackingClient.GetAllTracks({}, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response.tracks);
    });
});

// PUT /track/:id → mettre à jour la position
app.put("/track/:id", (req, res) => {
    const { location, status } = req.body;
    trackingClient.UpdateLocation(
        { id: req.params.id, location, status },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response);
        }
    );
});

// ========================
// GRAPHQL
// ========================
=======
app.get("/track", (req, res) => {
    trackingClient.GetAllTracks({}, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response.tracks || []);
    });
});

// ==========================================
// GRAPHQL (Schéma et Resolvers)
// ==========================================

>>>>>>> mayssa
const typeDefs = gql`
    type Order { id: Int, product: String, quantity: Int, status: String }
    type Delivery { id: String, order_id: Int, address: String, status: String }
    type Track { id: String, order_id: Int, location: String, status: String }

    type Delivery {
        id: String
        order_id: Int
        address: String
        status: String
    }

    type Track {
        id: String
        order_id: Int
        location: String
        status: String
    }

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
<<<<<<< HEAD
        // Orders
        getOrder: (_, { id }) =>
            new Promise((resolve, reject) => {
                orderClient.GetOrder({ id }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            }),
        getOrders: () =>
            new Promise((resolve, reject) => {
                orderClient.GetOrders({}, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.orders);
                });
            }),

        // Delivery
        getDelivery: (_, { id }) =>
            new Promise((resolve, reject) => {
                deliveryClient.GetDelivery({ id }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            }),
        getDeliveries: () =>
            new Promise((resolve, reject) => {
                deliveryClient.GetDeliveries({}, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.deliveries);
                });
            }),

        // Tracking
        getAllTracks: () =>
            new Promise((resolve, reject) => {
                trackingClient.GetAllTracks({}, (err, response) => {
                    if (err) reject(err);
                    else resolve(response.tracks);
                });
            }),
=======
        getOrder: (_, { id }) => new Promise((res, rej) => 
            orderClient.GetOrder({ id }, (err, d) => err ? rej(err) : res(d))),
        getOrders: () => new Promise((res, rej) => 
            orderClient.GetOrders({}, (err, d) => err ? rej(err) : res(d.orders))),
        getDelivery: (_, { id }) => new Promise((res, rej) => 
            deliveryClient.GetDelivery({ id }, (err, d) => err ? rej(err) : res(d))),
        getDeliveries: () => new Promise((res, rej) => 
            deliveryClient.GetDeliveries({}, (err, d) => err ? rej(err) : res(d.deliveries))),
        getAllTracks: () => new Promise((res, rej) => 
            trackingClient.GetAllTracks({}, (err, d) => err ? rej(err) : res(d.tracks)))
>>>>>>> mayssa
    },

    Mutation: {
<<<<<<< HEAD
        // Orders
        createOrder: (_, { product, quantity }) =>
            new Promise((resolve, reject) => {
                orderClient.CreateOrder({ product, quantity }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            }),

        // Delivery
        assignDelivery: (_, { order_id, address }) =>
            new Promise((resolve, reject) => {
                deliveryClient.AssignDelivery({ order_id, address }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            }),

        // Tracking
        trackOrder: (_, { order_id }) =>
            new Promise((resolve, reject) => {
                trackingClient.TrackOrder({ order_id }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            }),
    },
=======
        createOrder: (_, { product, quantity }) => new Promise((res, rej) => 
            orderClient.CreateOrder({ product, quantity }, (err, d) => err ? rej(err) : res(d))),
        assignDelivery: (_, { order_id, address }) => new Promise((res, rej) => 
            deliveryClient.AssignDelivery({ order_id, address }, (err, d) => err ? rej(err) : res(d))),
        trackOrder: (_, { order_id }) => new Promise((res, rej) => 
            trackingClient.TrackOrder({ order_id }, (err, d) => err ? rej(err) : res(d)))
    }
>>>>>>> mayssa
};

// Lancement global
async function startServer() {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    server.applyMiddleware({ app });

    app.listen(PORT, () => {
        console.log(`✅ Gateway REST: http://localhost:${PORT}`);
        console.log(`🟣 Gateway GraphQL: http://localhost:${PORT}/graphql`);
    });
}

startServer().catch(err => console.error("Erreur au démarrage :", err));