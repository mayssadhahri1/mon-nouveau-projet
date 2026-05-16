const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

// Chemin vers le fichier proto
const PROTO_PATH = path.join(__dirname, "../proto/tracking.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const trackingPackage = grpc.loadPackageDefinition(packageDef).tracking;

let tracks = [];
let idCounter = 1;

function TrackOrder(call, callback) {
    const { order_id } = call.request;
    const track = {
        id: "TRK-" + idCounter++,
        order_id: order_id,
        location: "Entrepôt central",
        status: "en cours",
    };
    tracks.push(track);
    console.log("📍 [gRPC] Suivi créé pour commande:", order_id);
    callback(null, track);
}

function GetAllTracks(call, callback) {
    console.log("📍 [gRPC] Envoi de tous les suivis");
    callback(null, { tracks: tracks });
}

function UpdateLocation(call, callback) {
    const { id, location } = call.request;
    const index = tracks.findIndex(t => t.id === id);
    if (index !== -1) {
        tracks[index].location = location;
        callback(null, tracks[index]);
    } else {
        callback({ code: grpc.status.NOT_FOUND, message: "Suivi non trouvé" });
    }
}

const server = new grpc.Server();
server.addService(trackingPackage.TrackingService.service, {
    TrackOrder, GetAllTracks, UpdateLocation
});

server.bindAsync("0.0.0.0:50053", grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) return console.error("❌ Erreur:", err);
    console.log(`📍 Tracking Service (gRPC) en ligne sur le port ${port}`);
});