const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const Database = require("better-sqlite3");
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// ==========================================
// 1. Initialisation SQLite (Base de données)
// ==========================================
const db = new Database("orders.db");

// Création des tables orders et users
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT,
        quantity INTEGER,
        status TEXT DEFAULT 'pending'
    );
    
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    );
`);

// ==========================================
// 2. SIMULATION KAFKA (Évite l'erreur de crash)
// ==========================================
console.log("🔮 Mode simulation Kafka activé (Pas besoin d'installer Kafka !)");

// Au lieu de se connecter à un vrai serveur, on simule l'envoi
async function sendToKafka(topic, message) {
    try {
        console.log(`📡 [KAFKA MOCK] Événement envoyé au topic "${topic}" :`, message);
        console.log(`⚡ Kafka notifie virtuellement Nour (Delivery Service) !`);
    } catch (error) {
        console.error("❌ Erreur de simulation Kafka:", error);
    }
}

// ==========================================
// 3. Charger le fichier Proto (Pour gRPC)
// ==========================================
const packageDef = protoLoader.loadSync("../proto/order.proto", {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const orderPackage = grpc.loadPackageDefinition(packageDef).order;

// ==========================================
// 4. Implémentation des fonctions gRPC
// ==========================================
async function CreateOrder(call, callback) {
    const { product, quantity } = call.request;
    try {
        const stmt = db.prepare(
            "INSERT INTO orders (product, quantity, status) VALUES (?, ?, 'pending')"
        );
        const result = stmt.run(product, quantity);
        
        const newOrder = {
            id: result.lastInsertRowid,
            product,
            quantity,
            status: "pending",
        };

        console.log("✅ Commande créée en DB:", newOrder);

        // Appel de notre fonction simulée
        await sendToKafka('order-topic', newOrder);

        callback(null, newOrder);
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

function GetOrder(call, callback) {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(call.request.id);
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

// Démarrage du serveur gRPC
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
    (err, port) => {
        if (err) return console.error(err);
        console.log(`📦 Order Service gRPC running on port ${port}`);
    }
);

// ==========================================
// 5. Configuration et Routes HTTP Express (Auth)
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());

// Inscription
app.post('/internal/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Veuillez remplir tous les champs." });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const insert = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
        insert.run(email, hashedPassword);

        return res.status(201).json({ message: "Votre inscription est réussie ! Vous pouvez vous connecter." });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: "Cette adresse email est déjà enregistrée." });
        }
        return res.status(500).json({ error: "Erreur lors de la sauvegarde de l'utilisateur." });
    }
});

// Connexion
app.post('/internal/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Veuillez remplir tous les champs." });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            return res.status(401).json({ error: "Identifiants incorrects." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Identifiants incorrects." });
        }

        return res.json({
            message: "Connexion réussie !",
            token: "fake-jwt-token-pour-le-moment",
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        return res.status(500).json({ error: "Erreur lors de la tentative de connexion." });
    }
});

// Lancement du serveur HTTP pour l'Auth (Port 3001 pour ne pas bloquer l'API gateway)
const HTTP_PORT = 3001;
app.listen(HTTP_PORT, () => {
    console.log(`🔐 Auth Server (Express) running on port ${HTTP_PORT}`);
});