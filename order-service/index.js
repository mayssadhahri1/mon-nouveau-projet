const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const Database = require("better-sqlite3");

// Base de données SQLite
const db = new Database("orders.db");
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT,
        quantity INTEGER,
        status TEXT DEFAULT 'pending'
    )
`);

// Charger le proto
const packageDef = protoLoader.loadSync("../proto/order.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);
const orderPackage = grpcObject.order;

// ========================
// Implémentation gRPC
// ========================
function CreateOrder(call, callback) {
    const { product, quantity } = call.request;
    const stmt = db.prepare(
        "INSERT INTO orders (product, quantity, status) VALUES (?, ?, 'pending')"
    );
    const result = stmt.run(product, quantity);
    callback(null, {
        id: result.lastInsertRowid,
        product,
        quantity,
        status: "pending",
    });
}

function GetOrder(call, callback) {
    const order = db
        .prepare("SELECT * FROM orders WHERE id = ?")
        .get(call.request.id);
    if (!order) return callback({ code: grpc.status.NOT_FOUND, message: "Order not found" });
    callback(null, order);
}

function GetOrders(call, callback) {
    const orders = db.prepare("SELECT * FROM orders").all();
    callback(null, { orders });
}

function UpdateOrder(call, callback) {
    const { id, status } = call.request;
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
    callback(null, order);
}

function DeleteOrder(call, callback) {
    db.prepare("DELETE FROM orders WHERE id = ?").run(call.request.id);
    callback(null, { message: "Order deleted successfully" });
}

// ========================
// Démarrer le serveur gRPC
// ========================
const server = new grpc.Server();
server.addService(orderPackage.OrderService.service, {
    CreateOrder,
    GetOrder,
    GetOrders,
    UpdateOrder,
    DeleteOrder,
});

server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    () => {
        console.log("📦 Order Service running on port 50051");
    }
);