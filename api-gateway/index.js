const express = require("express");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { ApolloServer, gql } = require("apollo-server-express");

const app = express();
const PORT = 3000;

// ✅ PAS de body-parser global — conflit avec Apollo
app.use((req, res, next) => {
    if (req.path === "/graphql") return next();
    express.json()(req, res, next);
});

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
app.post("/orders", (req, res) => {
    const { product, quantity } = req.body;
    orderClient.CreateOrder({ product, quantity }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
});

app.get("/orders", (req, res) => {
    orderClient.GetOrders({}, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response.orders);
    });
});

app.get("/orders/:id", (req, res) => {
    orderClient.GetOrder({ id: parseInt(req.params.id) }, (err, response) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(response);
    });
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