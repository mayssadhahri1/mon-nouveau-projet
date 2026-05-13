const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const Database = require("better-sqlite3");

// ========================
// 1. SQLite Database
// ========================
const db = new Database("tracking.db");
db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        order_id INTEGER,
        location TEXT DEFAULT 'Entrepôt central',
        status TEXT DEFAULT 'en cours'
    )
`);

function getNextId() {
    const row = db.prepare("SELECT COUNT(*) as count FROM tracks").get();
    return row.count + 1;
}

// ========================
// 2. Charger le Proto
// ========================
const PROTO_PATH = path.join(__dirname, "../proto/tracking.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const trackingPackage = grpc.loadPackageDefinition(packageDef).tracking;

// ========================
// 3. Implémentation gRPC
// ========================

// Créer un suivi
function TrackOrder(call, callback) {
    const { order_id } = call.request;
    const id = "TRK-" + getNextId();
    const track = {
        id,
        order_id,
        location: "Entrepôt central",
        status: "en cours",
    };

    db.prepare(
        "INSERT INTO tracks (id, order_id, location, status) VALUES (?, ?, ?, ?)"
    ).run(track.id, track.order_id, track.location, track.status);

    console.log("📍 [gRPC] Suivi créé et persisté pour commande:", order_id);
    callback(null, track);
}

// Voir tous les suivis
function GetAllTracks(call, callback) {
    const tracks = db.prepare("SELECT * FROM tracks").all();
    console.log("📍 [gRPC] Envoi de tous les suivis — Total:", tracks.length);
    callback(null, { tracks });
}

// Mettre à jour la localisation
function UpdateLocation(call, callback) {
    const { id, location, status } = call.request;
    const existing = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id);

    if (!existing) {
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Suivi non trouvé",
        });
    }

    db.prepare(
        "UPDATE tracks SET location = ?, status = ? WHERE id = ?"
    ).run(location, status || existing.status, id);

    const updated = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id);
    console.log("✅ [gRPC] Localisation mise à jour:", id, "->", location);
    callback(null, updated);
}

// ========================
// 4. Démarrage du serveur
// ========================
const server = new grpc.Server();

server.addService(trackingPackage.TrackingService.service, {
    TrackOrder,
    GetAllTracks,
    UpdateLocation,
});

server.bindAsync(
    "0.0.0.0:50053",
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
        if (err) {
            console.error("❌ Erreur démarrage:", err);
            return;
        }
        console.log(`📍 Tracking Service en ligne sur le port ${port}`);
        console.log(`💾 Base de données SQLite: tracking.db`);
    }
);