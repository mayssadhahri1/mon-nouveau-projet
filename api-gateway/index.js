
// Point d’entrée principal entre le frontend et les microservices

const express = require("express");
const cors = require("cors");
const http = require("http");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
// Apollo Server + GraphQL
const { ApolloServer, gql } = require("apollo-server-express");
const app = express();
const PORT = 3000;


// ========================
// OPTIONS DE CONFIGURATION gRPC
// ========================

const protoOptions = {

    // Conserve les noms des champs tels qu’ils sont
    keepCase: true,

    // Convertit les nombres longs en String
    longs: String,

    // Convertit les enums en String
    enums: String,
    defaults: true,

    // Support des champs oneof
    oneofs: true
};

// Permet au frontend d’accéder au backend
app.use(cors());
// Transforme automatiquement le body reçu en objet JavaScript
app.use((req, res, next) => {
    // Ignore GraphQL
    if (req.path === "/graphql") return next();
    // Lecture du JSON
    express.json()(req, res, next);
});

// Cette fonction redirige les requêtes vers le service auth
function forwardToAuth(req, res, path) {

    // Conversion du body en JSON
    const body = JSON.stringify(req.body);

    // Configuration de la requête HTTP
    const options = {

        // Adresse du service auth
        hostname: "127.0.0.1",

        // Port du auth-service
        port: 4001,

        // Route cible
        path,

        // Méthode HTTP
        method: "POST",

        // Headers HTTP
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
        },
    };

    // Création de la requête proxy
    const proxyReq = http.request(options, (proxyRes) => {

        // Variable qui stocke la réponse
        let data = "";

        // Réception des données
        proxyRes.on("data", (chunk) => {
            data += chunk;
        });

        // Fin de la réponse
        proxyRes.on("end", () => {

            try {

                // Retourne la réponse du auth-service
                res.status(proxyRes.statusCode).json(JSON.parse(data));

            } catch {

                // Gestion erreur JSON
                res.status(502).json({
                    error: "Réponse invalide de l'auth-service"
                });
            }
        });
    });

    // Gestion erreur connexion auth-service
    proxyReq.on("error", () => {

        res.status(503).json({
            error: "Auth service indisponible"
        });
    });

    // Envoi du body
    proxyReq.write(body);

    // Fin de requête
    proxyReq.end();
}


// ========================
// ROUTES AUTHENTIFICATION
// ========================


// Route inscription utilisateur
app.post("/auth/register", (req, res) =>

    forwardToAuth(req, res, "/register")
);


// Route connexion utilisateur
app.post("/auth/login", (req, res) =>

    forwardToAuth(req, res, "/login")
);


// ============================================================
// 3. CONNEXIONS AUX MICROSERVICES gRPC
// ============================================================


// ========================
// SERVICE COMMANDES
// ========================

// Chargement du fichier order.proto
const orderProto = protoLoader.loadSync(
    "../proto/order.proto",
    protoOptions
);

// Création du client gRPC OrderService
const orderClient = new (
    grpc.loadPackageDefinition(orderProto)
    .order
    .OrderService
)(
    "127.0.0.1:50051",

    grpc.credentials.createInsecure()
);


// ========================
// SERVICE LIVRAISON
// ========================

// Chargement du proto livraison
const deliveryProto = protoLoader.loadSync(
    "../proto/delivery.proto",
    protoOptions
);

// Création du client livraison
const deliveryClient = new (
    grpc.loadPackageDefinition(deliveryProto)
    .delivery
    .DeliveryService
)(
    "127.0.0.1:50052",

    grpc.credentials.createInsecure()
);


// ========================
// SERVICE TRACKING
// ========================

// Chargement du proto tracking
const trackingProto = protoLoader.loadSync(
    "../proto/tracking.proto",
    protoOptions
);

// Création du client tracking
const trackingClient = new (
    grpc.loadPackageDefinition(trackingProto)
    .tracking
    .TrackingService
)(
    "127.0.0.1:50053",

    grpc.credentials.createInsecure()
);


// ============================================================
// 4. ROUTES REST — COMMANDES
// ============================================================


// ========================
// CRÉER UNE COMMANDE
// ========================

app.post("/orders", (req, res) => {

    // Récupération des données envoyées
    const { product, quantity } = req.body;

    // Appel du microservice gRPC
    orderClient.CreateOrder(

        {
            product,

            quantity: parseInt(quantity)
        },

        // Callback réponse
        (err, response) => {

            // Gestion erreur
            if (err)
                return res.status(500).json({
                    error: err.message
                });

            // Retourne la réponse
            res.json(response);
        }
    );
});


// ========================
// RÉCUPÉRER TOUTES LES COMMANDES
// ========================

app.get("/orders", (req, res) => {

    orderClient.GetOrders({}, (err, response) => {

        if (err)
            return res.status(500).json([]);

        // Retour liste commandes
        res.json(response.orders || []);
    });
});


// ========================
// RÉCUPÉRER UNE COMMANDE
// ========================

app.get("/orders/:id", (req, res) => {

    orderClient.GetOrder(

        {
            id: parseInt(req.params.id)
        },

        (err, response) => {

            if (err)
                return res.status(404).json({
                    error: "Commande non trouvée"
                });

            res.json(response);
        }
    );
});


// ========================
// MODIFIER UNE COMMANDE
// ========================

app.put("/orders/:id", (req, res) => {

    // Nouveau statut
    const { status } = req.body;

    orderClient.UpdateOrder(

        {
            id: parseInt(req.params.id),
            status
        },

        (err, response) => {

            if (err)
                return res.status(500).json({
                    error: err.message
                });

            res.json(response);
        }
    );
});


// ========================
// SUPPRIMER UNE COMMANDE
// ========================

app.delete("/orders/:id", (req, res) => {

    orderClient.DeleteOrder(

        {
            id: parseInt(req.params.id)
        },

        (err, response) => {

            if (err)
                return res.status(500).json({
                    error: err.message
                });

            res.json(response);
        }
    );
});


// ============================================================
// 5. ROUTES REST — LIVRAISONS
// ============================================================


// ========================
// ASSIGNER UNE LIVRAISON
// ========================

app.post("/delivery", (req, res) => {

    const { order_id, address } = req.body;

    deliveryClient.AssignDelivery(

        {
            order_id: parseInt(order_id),
            address
        },

        (err, response) => {

            if (err)
                return res.status(500).json({
                    error: err.message
                });

            res.json(response);
        }
    );
});


// ========================
// LISTE DES LIVRAISONS
// ========================

app.get("/delivery", (req, res) => {

    deliveryClient.GetDeliveries({}, (err, response) => {

        if (err)
            return res.status(500).json([]);

        res.json(response.deliveries || []);
    });
});


// ============================================================
// 6. ROUTES REST — TRACKING
// ============================================================


// ========================
// CRÉER UN TRACKING
// ========================

app.post("/track", (req, res) => {

    const { order_id } = req.body;

    trackingClient.TrackOrder(

        {
            order_id: parseInt(order_id)
        },

        (err, response) => {

            if (err)
                return res.status(500).json({
                    error: err.message
                });

            res.json(response);
        }
    );
});


// ========================
// RÉCUPÉRER TOUS LES TRACKINGS
// ========================

app.get("/track", (req, res) => {

    trackingClient.GetAllTracks({}, (err, response) => {

        if (err)
            return res.status(500).json([]);

        res.json(response.tracks || []);
    });
});


// ============================================================
// 7. GRAPHQL
// ============================================================


// Définition des types GraphQL
const typeDefs = gql`

    // ========================
    // TYPE COMMANDE
    // ========================
    type Order {

        id: Int

        product: String

        quantity: Int

        status: String
    }

    // ========================
    // TYPE LIVRAISON
    // ========================
    type Delivery {

        id: String

        order_id: Int

        address: String

        status: String
    }

    // ========================
    // TYPE TRACKING
    // ========================
    type Track {

        id: String

        order_id: Int

        location: String

        status: String
    }

    // ========================
    // REQUÊTES GRAPHQL
    // ========================
    type Query {

        getOrder(id: Int!): Order

        getOrders: [Order]

        getDelivery(id: String!): Delivery

        getDeliveries: [Delivery]

        getAllTracks: [Track]
    }

    // ========================
    // MUTATIONS GRAPHQL
    // ========================
    type Mutation {

        createOrder(
            product: String!,
            quantity: Int!
        ): Order

        assignDelivery(
            order_id: Int!,
            address: String!
        ): Delivery

        trackOrder(
            order_id: Int!
        ): Track

        updateOrderStatus(
            id: Int!,
            status: String!
        ): Order

        updateDeliveryStatus(
            id: String!,
            status: String!
        ): Delivery
    }
`;


// ============================================================
// RESOLVERS GRAPHQL
// ============================================================

const resolvers = {

    Query: {

        // Récupérer une commande
        getOrder: (_, { id }) =>

            new Promise((resolve, reject) => {

                orderClient.GetOrder(

                    { id },

                    (err, data) =>

                        err
                            ? reject(err)
                            : resolve(data)
                );
            }),
    },

    Mutation: {

        // Créer une commande
        createOrder: (_, { product, quantity }) =>

            new Promise((resolve, reject) => {

                orderClient.CreateOrder(

                    {
                        product,
                        quantity
                    },

                    (err, data) =>

                        err
                            ? reject(err)
                            : resolve(data)
                );
            }),
    },
};


// ============================================================
// 8. DÉMARRAGE DU SERVEUR
// ============================================================

async function startServer() {

    // Création du serveur GraphQL
    const server = new ApolloServer({

        typeDefs,

        resolvers,

        // Autorise introspection GraphQL
        introspection: true,

        // Active playground GraphQL
        playground: true,
    });

    // Démarrage Apollo Server
    await server.start();

    // Connexion Apollo + Express
    server.applyMiddleware({ app });

    // Démarrage du serveur Express
    app.listen(PORT, () => {

        console.log(
            `✅ Gateway REST en ligne : http://localhost:${PORT}`
        );

        console.log(
            `🟣 GraphQL disponible : http://localhost:${PORT}/graphql`
        );

        console.log(
            `🔐 Auth-service : http://localhost:4001`
        );
    });
}


// Lancement du serveur
startServer().catch((err) => {

    console.error(
        "❌ Erreur au démarrage :",
        err
    );
});