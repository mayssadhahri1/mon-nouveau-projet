// ============================================================
// GATEWAY — Point d'entrée unique entre le frontend et les services
// Ce fichier reçoit toutes les requêtes et les redirige
// vers le bon service (commandes, livraisons, tracking)
// ============================================================

// --- On importe les outils dont on a besoin ---
const express = require("express");               // outil pour créer un serveur web
const cors = require("cors");                     // autorise les appels depuis d'autres sites
const grpc = require("@grpc/grpc-js");            // protocole de communication rapide entre services
const protoLoader = require("@grpc/proto-loader"); // lit les fichiers .proto (contrats de communication)
const { ApolloServer, gql } = require("apollo-server-express"); // serveur GraphQL

// --- On crée l'application web et on choisit le port ---
const app = express();
const PORT = 3000; // l'app sera accessible sur http://localhost:3000

// --- Options pour lire les fichiers .proto correctement ---
const protoOptions = {
    keepCase: true,  // garde les noms tels quels (pas de conversion camelCase)
    longs: String,   // les grands nombres sont lus comme des textes
    enums: String,   // les énumérations aussi
    defaults: true,  // inclut les valeurs par défaut si elles manquent
    oneofs: true     // gère les champs "un parmi plusieurs"
};


// ========================
// 1. MIDDLEWARE
// Ce sont des filtres : chaque requête passe par là avant d'être traitée
// ========================

app.use(cors()); // autorise tout le monde à appeler notre API (pas de blocage navigateur)

app.use((req, res, next) => {
    // Si la requête va vers GraphQL (/graphql), on la laisse passer sans rien faire
    // car GraphQL gère lui-même la lecture du contenu
    if (req.path === "/graphql") return next();

    // Pour toutes les autres routes, on lit le JSON envoyé dans la requête
    // Exemple : { "product": "vélo", "quantity": 2 }
    express.json()(req, res, next);
});


// ========================
// 2. CONNEXIONS gRPC
// On ouvre une "ligne téléphonique" vers chaque micro-service
// Chaque service tourne sur un port différent de la même machine
// ========================

// --- Service Commandes (port 50051) ---
const orderProto = protoLoader.loadSync("../proto/order.proto", protoOptions);
// On lit le contrat de communication pour les commandes

const orderClient = new (grpc.loadPackageDefinition(orderProto).order.OrderService)(
    "127.0.0.1:50051",          // adresse du service (127.0.0.1 = cette même machine)
    grpc.credentials.createInsecure() // pas de chiffrement (OK pour développement local)
);

// --- Service Livraisons (port 50052) ---
const deliveryProto = protoLoader.loadSync("../proto/delivery.proto", protoOptions);
const deliveryClient = new (grpc.loadPackageDefinition(deliveryProto).delivery.DeliveryService)(
    "127.0.0.1:50052",
    grpc.credentials.createInsecure()
);

// --- Service Tracking / Suivi (port 50053) ---
const trackingProto = protoLoader.loadSync("../proto/tracking.proto", protoOptions);
const trackingClient = new (grpc.loadPackageDefinition(trackingProto).tracking.TrackingService)(
    "127.0.0.1:50053",
    grpc.credentials.createInsecure()
);


// ========================
// 3. ROUTES REST — COMMANDES
// Ces URLs permettent de gérer les commandes via HTTP classique
// ========================

// POST /orders → créer une nouvelle commande
// Exemple d'appel : POST http://localhost:3000/orders
// Corps envoyé   : { "product": "vélo", "quantity": 2 }
app.post("/orders", (req, res) => {
    const { product, quantity } = req.body; // on récupère les données du corps de la requête
    orderClient.CreateOrder(
        { product, quantity: parseInt(quantity) }, // parseInt() convertit "2" en nombre 2
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message }); // erreur serveur
            res.json(response); // on renvoie la commande créée
        }
    );
});

// GET /orders → récupérer toutes les commandes
// Exemple d'appel : GET http://localhost:3000/orders
app.get("/orders", (req, res) => {
    orderClient.GetOrders({}, (err, response) => {
        if (err) return res.status(500).json([]); // en cas d'erreur, on renvoie un tableau vide
        res.json(response.orders || []); // on renvoie la liste des commandes (ou [] si vide)
    });
});

// GET /orders/:id → récupérer UNE commande par son identifiant
// Exemple d'appel : GET http://localhost:3000/orders/42
app.get("/orders/:id", (req, res) => {
    orderClient.GetOrder(
        { id: parseInt(req.params.id) }, // req.params.id = le "42" dans l'URL
        (err, response) => {
            if (err) return res.status(404).json({ error: "Commande non trouvée" }); // 404 = pas trouvé
            res.json(response);
        }
    );
});

// PUT /orders/:id → modifier le statut d'une commande existante
// Exemple d'appel : PUT http://localhost:3000/orders/42
// Corps envoyé   : { "status": "expédiée" }
app.put("/orders/:id", (req, res) => {
    const { status } = req.body; // nouveau statut envoyé dans le corps
    orderClient.UpdateOrder(
        { id: parseInt(req.params.id), status },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response); // renvoie la commande mise à jour
        }
    );
});

// DELETE /orders/:id → supprimer une commande
// Exemple d'appel : DELETE http://localhost:3000/orders/42
app.delete("/orders/:id", (req, res) => {
    orderClient.DeleteOrder(
        { id: parseInt(req.params.id) },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response); // confirmation de suppression
        }
    );
});


// ========================
// 4. ROUTES REST — LIVRAISONS
// Ces URLs permettent de gérer les livraisons
// ========================

// POST /delivery → assigner une livraison à une commande
// Corps envoyé : { "order_id": 42, "address": "12 rue de Paris" }
app.post("/delivery", (req, res) => {
    const { order_id, address } = req.body;
    deliveryClient.AssignDelivery(
        { order_id: parseInt(order_id), address },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response); // renvoie la livraison créée
        }
    );
});

// GET /delivery → récupérer toutes les livraisons
app.get("/delivery", (req, res) => {
    deliveryClient.GetDeliveries({}, (err, response) => {
        if (err) return res.status(500).json([]);
        res.json(response.deliveries || []);
    });
});

// GET /delivery/:id → récupérer UNE livraison par son identifiant
// Exemple d'appel : GET http://localhost:3000/delivery/abc123
app.get("/delivery/:id", (req, res) => {
    deliveryClient.GetDelivery(
        { id: req.params.id }, // ici l'id est une chaîne de texte (pas un nombre)
        (err, response) => {
            if (err) return res.status(404).json({ error: "Livraison non trouvée" });
            res.json(response);
        }
    );
});

// PUT /delivery/:id → mettre à jour le statut d'une livraison
// Corps envoyé : { "status": "en cours" }
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
// 5. ROUTES REST — TRACKING (suivi de colis)
// Ces URLs permettent de suivre où en est une commande
// ========================

// POST /track → commencer le suivi d'une commande
// Corps envoyé : { "order_id": 42 }
app.post("/track", (req, res) => {
    const { order_id } = req.body;
    trackingClient.TrackOrder(
        { order_id: parseInt(order_id) },
        (err, response) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(response); // renvoie les infos de suivi créées
        }
    );
});

// GET /track → récupérer tous les suivis
app.get("/track", (req, res) => {
    trackingClient.GetAllTracks({}, (err, response) => {
        if (err) return res.status(500).json([]);
        res.json(response.tracks || []);
    });
});

// PUT /track/:id → mettre à jour la position et le statut d'un suivi
// Corps envoyé : { "location": "Lyon", "status": "en transit" }
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
// 6. GRAPHQL
// Une deuxième façon d'accéder aux données, plus flexible que REST
// Tout passe par une seule URL : /graphql
// On précise exactement ce qu'on veut dans la requête
// ========================

// --- typeDefs = le "menu" GraphQL ---
// C'est ici qu'on décrit les types de données et les actions disponibles
const typeDefs = gql`

    # Un objet Commande avec ses champs
    type Order {
        id: Int
        product: String
        quantity: Int
        status: String
    }

    # Un objet Livraison avec ses champs
    type Delivery {
        id: String
        order_id: Int
        address: String
        status: String
    }

    # Un objet Suivi (tracking) avec ses champs
    type Track {
        id: String
        order_id: Int
        location: String
        status: String
    }

    # Query = ce qu'on peut LIRE (lecture seule)
    type Query {
        getOrder(id: Int!): Order       # récupérer une commande par id (! = obligatoire)
        getOrders: [Order]              # récupérer toutes les commandes (tableau)

        getDelivery(id: String!): Delivery
        getDeliveries: [Delivery]

        getAllTracks: [Track]
    }

    # Mutation = ce qu'on peut ÉCRIRE (créer, modifier)
    type Mutation {
        createOrder(product: String!, quantity: Int!): Order        # créer une commande
        assignDelivery(order_id: Int!, address: String!): Delivery  # créer une livraison
        trackOrder(order_id: Int!): Track                           # démarrer un suivi
        updateOrderStatus(id: Int!, status: String!): Order         # modifier statut commande
        updateDeliveryStatus(id: String!, status: String!): Delivery # modifier statut livraison
    }
`;

// --- resolvers = ce qu'on fait concrètement pour chaque action GraphQL ---
// Chaque fonction ici appelle le bon service gRPC et renvoie les données
const resolvers = {

    // --- Résolveurs de LECTURE ---
    Query: {

        // Récupérer une commande par id
        getOrder: (_, { id }) =>
            new Promise((resolve, reject) => {
                // on appelle le service Commandes via gRPC
                orderClient.GetOrder({ id }, (err, data) => {
                    if (err) reject(err);   // si erreur, on la propage
                    else resolve(data);     // sinon on renvoie les données
                });
            }),

        // Récupérer toutes les commandes
        getOrders: () =>
            new Promise((resolve, reject) => {
                orderClient.GetOrders({}, (err, data) => {
                    if (err) reject(err);
                    else resolve(data.orders || []); // renvoie le tableau ou [] si vide
                });
            }),

        // Récupérer une livraison par id
        getDelivery: (_, { id }) =>
            new Promise((resolve, reject) => {
                deliveryClient.GetDelivery({ id }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            }),

        // Récupérer toutes les livraisons
        getDeliveries: () =>
            new Promise((resolve, reject) => {
                deliveryClient.GetDeliveries({}, (err, data) => {
                    if (err) reject(err);
                    else resolve(data.deliveries || []);
                });
            }),

        // Récupérer tous les suivis de colis
        getAllTracks: () =>
            new Promise((resolve, reject) => {
                trackingClient.GetAllTracks({}, (err, data) => {
                    if (err) reject(err);
                    else resolve(data.tracks || []);
                });
            }),
    },

    // --- Résolveurs d'ÉCRITURE ---
    Mutation: {

        // Créer une nouvelle commande
        createOrder: (_, { product, quantity }) =>
            new Promise((resolve, reject) => {
                orderClient.CreateOrder(
                    { product, quantity },
                    (err, data) => {
                        if (err) reject(err);
                        else resolve(data); // renvoie la commande créée
                    }
                );
            }),

        // Assigner une livraison à une commande
        assignDelivery: (_, { order_id, address }) =>
            new Promise((resolve, reject) => {
                deliveryClient.AssignDelivery(
                    { order_id, address },
                    (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    }
                );
            }),

        // Démarrer le suivi d'une commande
        trackOrder: (_, { order_id }) =>
            new Promise((resolve, reject) => {
                trackingClient.TrackOrder(
                    { order_id },
                    (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    }
                );
            }),

        // Modifier le statut d'une commande
        updateOrderStatus: (_, { id, status }) =>
            new Promise((resolve, reject) => {
                orderClient.UpdateOrder(
                    { id, status },
                    (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    }
                );
            }),

        // Modifier le statut d'une livraison
        updateDeliveryStatus: (_, { id, status }) =>
            new Promise((resolve, reject) => {
                deliveryClient.UpdateDeliveryStatus(
                    { id, status },
                    (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    }
                );
            }),
    },
};


// ========================
// 7. DÉMARRAGE DU SERVEUR
// On démarre Apollo (GraphQL) et Express ensemble
// ========================

async function startServer() {

    // On crée le serveur GraphQL avec notre menu (typeDefs) et nos fonctions (resolvers)
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true, // active l'exploration du schéma (utile pour les outils)
        playground: true,    // active l'interface web pour tester GraphQL manuellement
    });

    await server.start(); // on démarre Apollo (obligatoire avant de l'attacher)

    server.applyMiddleware({ app }); // on attache GraphQL à notre app Express sur /graphql

    // On ouvre le port 3000 pour que l'app soit accessible
    app.listen(PORT, () => {
        console.log(`✅ Gateway REST en ligne   : http://localhost:${PORT}`);
        console.log(`🟣 Gateway GraphQL en ligne : http://localhost:${PORT}/graphql`);
    });
}

// On lance le serveur, et si ça plante on affiche l'erreur dans la console
startServer().catch((err) => {
    console.error("❌ Erreur au démarrage d'Apollo Server :", err);
});
