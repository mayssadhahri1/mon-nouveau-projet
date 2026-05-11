const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Simulation base de données en mémoire
let tracks = [];
let idCounter = 1;

// Charger le proto
const packageDef = protoLoader.loadSync("../proto/tracking.proto");
const grpcObject = grpc.loadPackageDefinition(packageDef);
const trackingPackage = grpcObject.tracking;

// ========================
// Implémentation gRPC
// ========================

// Suivre une commande
function TrackOrder(call, callback) {
    const { order_id } = call.request;

    const track = {
        id: String(idCounter++),
        order_id,
        location: "Entrepôt principal",
        status: "en cours",
    };

    tracks.push(track);
    console.log("Track created:", track);
    callback(null, track);
}

// Voir tous les suivis
function GetAllTracks(call, callback) {
    callback(null, { tracks });
}

// Mettre à jour la position
function UpdateLocation(call, callback) {
    const { id, location, status } = call.request;

    const track = tracks.find((t) => t.id === id);

    if (!track) {
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Track not found",
        });
    }

    track.location = location;
    track.status = status;

    console.log("Track updated:", track);
    callback(null, track);
}

// ========================
// Démarrer le serveur gRPC
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
    () => {
        console.log("📍 Tracking Service running on port 50053");
    }
);