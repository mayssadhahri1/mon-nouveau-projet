const express = require("express");
const bodyParser = require("body-parser");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { ApolloServer, gql } = require("apollo-server-express");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// ========================
// gRPC — connexion order-service
// ========================
const packageDef = protoLoader.loadSync("../proto/order.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);
const orderPackage = grpcObject.order;

const orderClient = new orderPackage.OrderService(
    "localhost:50051",
    grpc.credentials.createInsecure()
);

// ========================
// REST API
// ========================

// POST /orders → créer une commande
app.post("/orders", (req, res) => {
    const { product, quantity } = req.body;
    orderClient.CreateOrder({ product, quantity }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

// GET /orders → voir toutes les commandes
app.get("/orders", (req, res) => {
    orderClient.GetOrders({}, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response.orders);
    });
});

// GET /orders/:id → voir une commande
app.get("/orders/:id", (req, res) => {
    orderClient.GetOrder({ id: parseInt(req.params.id) }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

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
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

// ========================
// GRAPHQL
// ========================
const typeDefs = gql`
    type Order {
        id: Int
        product: String
        quantity: Int
        status: String
    }

    type Query {
        getOrder(id: Int!): Order
        getOrders: [Order]
    }

    type Mutation {
        createOrder(product: String!, quantity: Int!): Order
    }
`;

const resolvers = {
    Query: {
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
    },
    Mutation: {
        createOrder: (_, { product, quantity }) =>
            new Promise((resolve, reject) => {
                orderClient.CreateOrder({ product, quantity }, (err, response) => {
                    if (err) reject(err);
                    else resolve(response);
                });
            }),
    },
};

async function startServer() {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    server.applyMiddleware({ app });

    app.listen(PORT, () => {
        console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
        console.log(`🟣 GraphQL ready at http://localhost:${PORT}/graphql`);
    });
}

startServer();