// ============================================================
// GATEWAY — Point d'entrée unique entre le frontend et les services
// ============================================================

const express     = require("express");
const cors        = require("cors");
const http        = require("http");                          // ← AJOUT : pour le proxy auth
const grpc        = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { ApolloServer, gql } = require("apollo-server-express");

const app  = express();
const PORT = 3000;

const protoOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
};


// ========================
// 1. MIDDLEWARE
// ========================

app.use(cors());

app.use((req, res, next) => {
    if (req.path === "/graphql") return next();
    express.json()(req, res, next);
});


// ========================
// 2. PROXY AUTH — redirige /auth/* vers l'auth-service (port 4001)
// L'auth-service tourne séparément dans services/auth-service.js
// ========================

function forwardToAuth(req, res, path) {
    const body = JSON.stringify(req.body);
    const options = {
        hostname: "127.0.0.1",
        port: 4001,
        path,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
        },
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = "";
        proxyRes.on("data", (chunk) => { data += chunk; });
        proxyRes.on("end", () => {
            try {
                res.status(proxyRes.statusCode).json(JSON.parse(data));
            } catch {
                res.status(502).json({ error: "Réponse invalide de l'auth-service" });
            }
        });
    });

    proxyReq.on("error", () => {
        res.status(503).json({ error: "Auth service indisponible — lance services/auth-service.js" });
    });

    proxyReq.write(body);
    proxyReq.end();
}

// POST /auth/register → auth-service:4001/register
app.post("/auth/register", (req, res) => forwardToAuth(req, res, "/register"));

// POST /auth/login → auth-service:4001/login
app.post("/auth/login",    (req, res) => forwardToAuth(req, res, "/login"));


// ========================
// 3. CONNEXIONS gRPC
// ========================

const orderProto = protoLoader.loadSync("../proto/order.proto", protoOptions);
const orderClient = new (grpc.loadPackageDefinition(orderProto).order.OrderService)(
    "127.0.0.1:50051",
    grpc.credentials.createInsecure()
);

const deliveryProto = protoLoader.loadSync("../proto/delivery.proto", protoOptions);
const deliveryClient = new (grpc.loadPackageDefinition(deliveryProto).delivery.DeliveryService)(
    "127.0.0.1:50052",
    grpc.credentials.createInsecure()
);

const trackingProto = protoLoader.loadSync("../proto/tracking.proto", protoOptions);
const trackingClient = new (grpc.loadPackageDefinition(trackingProto).tracking.TrackingService)(
    "127.0.0.1:50053",
    grpc.credentials.createInsecure()
);


// ========================
// 4. ROUTES REST — COMMANDES
// ========================

app.post("/orders", (req, res) => {
    const { product, quantity } = req.body;
    orderClient.CreateOrder(
        { product, quantity: parseInt(quantity) },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response);
        }
    );
});

app.get("/orders", (req, res) => {
    orderClient.GetOrders({}, (err, response) => {
        if (err) return res.status(500).json([]);
        res.json(response.orders || []);
    });
});

app.get("/orders/:id", (req, res) => {
    orderClient.GetOrder(
        { id: parseInt(req.params.id) },
        (err, response) => {
            if (err) return res.status(404).json({ error: "Commande non trouvée" });
            res.json(response);
        }
    );
});

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

app.delete("/orders/:id", (req, res) => {
    orderClient.DeleteOrder(
        { id: parseInt(req.params.id) },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response);
        }
    );
});


// ========================
// 5. ROUTES REST — LIVRAISONS
// ========================

app.post("/delivery", (req, res) => {
    const { order_id, address } = req.body;
    deliveryClient.AssignDelivery(
        { order_id: parseInt(order_id), address },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response);
        }
    );
});

app.get("/delivery", (req, res) => {
    deliveryClient.GetDeliveries({}, (err, response) => {
        if (err) return res.status(500).json([]);
        res.json(response.deliveries || []);
    });
});

app.get("/delivery/:id", (req, res) => {
    deliveryClient.GetDelivery(
        { id: req.params.id },
        (err, response) => {
            if (err) return res.status(404).json({ error: "Livraison non trouvée" });
            res.json(response);
        }
    );
});

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
// 6. ROUTES REST — TRACKING
// ========================

app.post("/track", (req, res) => {
    const { order_id } = req.body;
    trackingClient.TrackOrder(
        { order_id: parseInt(order_id) },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response);
        }
    );
});

app.get("/track", (req, res) => {
    trackingClient.GetAllTracks({}, (err, response) => {
        if (err) return res.status(500).json([]);
        res.json(response.tracks || []);
    });
});

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
// 7. GRAPHQL
// ========================

const typeDefs = gql`
    type Order {
        id: Int
        product: String
        quantity: Int
        status: String
    }

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
        updateOrderStatus(id: Int!, status: String!): Order
        updateDeliveryStatus(id: String!, status: String!): Delivery
    }
`;

const resolvers = {
    Query: {
        getOrder: (_, { id }) =>
            new Promise((resolve, reject) => {
                orderClient.GetOrder({ id }, (err, data) => err ? reject(err) : resolve(data));
            }),
        getOrders: () =>
            new Promise((resolve, reject) => {
                orderClient.GetOrders({}, (err, data) => err ? reject(err) : resolve(data.orders || []));
            }),
        getDelivery: (_, { id }) =>
            new Promise((resolve, reject) => {
                deliveryClient.GetDelivery({ id }, (err, data) => err ? reject(err) : resolve(data));
            }),
        getDeliveries: () =>
            new Promise((resolve, reject) => {
                deliveryClient.GetDeliveries({}, (err, data) => err ? reject(err) : resolve(data.deliveries || []));
            }),
        getAllTracks: () =>
            new Promise((resolve, reject) => {
                trackingClient.GetAllTracks({}, (err, data) => err ? reject(err) : resolve(data.tracks || []));
            }),
    },
    Mutation: {
        createOrder: (_, { product, quantity }) =>
            new Promise((resolve, reject) => {
                orderClient.CreateOrder({ product, quantity }, (err, data) => err ? reject(err) : resolve(data));
            }),
        assignDelivery: (_, { order_id, address }) =>
            new Promise((resolve, reject) => {
                deliveryClient.AssignDelivery({ order_id, address }, (err, data) => err ? reject(err) : resolve(data));
            }),
        trackOrder: (_, { order_id }) =>
            new Promise((resolve, reject) => {
                trackingClient.TrackOrder({ order_id }, (err, data) => err ? reject(err) : resolve(data));
            }),
        updateOrderStatus: (_, { id, status }) =>
            new Promise((resolve, reject) => {
                orderClient.UpdateOrder({ id, status }, (err, data) => err ? reject(err) : resolve(data));
            }),
        updateDeliveryStatus: (_, { id, status }) =>
            new Promise((resolve, reject) => {
                deliveryClient.UpdateDeliveryStatus({ id, status }, (err, data) => err ? reject(err) : resolve(data));
            }),
    },
};


// ========================
// 8. DÉMARRAGE DU SERVEUR
// ========================

async function startServer() {
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        playground: true,
    });

    await server.start();
    server.applyMiddleware({ app });

    app.listen(PORT, () => {
        console.log(`✅ Gateway REST en ligne    : http://localhost:${PORT}`);
        console.log(`🟣 Gateway GraphQL en ligne : http://localhost:${PORT}/graphql`);
        console.log(`🔐 Auth proxifié vers       : http://localhost:4001`);
    });
}

startServer().catch((err) => {
    console.error("❌ Erreur au démarrage :", err);
});