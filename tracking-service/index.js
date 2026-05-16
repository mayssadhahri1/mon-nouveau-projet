// ============================================================
// TRACKING SERVICE — Service de suivi de colis
// Ce fichier gère la localisation et le statut des commandes :
// - créer un suivi pour une commande
// - voir tous les suivis
// - mettre à jour la position et le statut d'un suivi
// Tout est stocké dans une base de données SQLite locale
//
// C'est le service le plus simple des trois :
// pas de Kafka ici, uniquement gRPC + SQLite
// ============================================================

// --- On importe les outils dont on a besoin ---
const grpc = require("@grpc/grpc-js");            // pour créer le serveur gRPC
const protoLoader = require("@grpc/proto-loader"); // pour lire le fichier .proto (contrat)
const path = require("path");                      // pour construire les chemins de fichiers
const Database = require("better-sqlite3");        // base de données SQLite (fichier local)


// ========================
// 1. BASE DE DONNÉES SQLite
// On stocke tous les suivis dans un fichier local "tracking.db"
// ========================

// On ouvre (ou crée) le fichier de base de données
const db = new Database("tracking.db");

// On crée la table "tracks" si elle n'existe pas encore
db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,                        -- identifiant unique du suivi (ex: "TRK-1")
        order_id INTEGER,                           -- identifiant de la commande suivie
        location TEXT DEFAULT 'Entrepôt central',  -- position actuelle (valeur par défaut)
        status TEXT DEFAULT 'en cours'             -- statut par défaut = "en cours"
    )
`);

// Fonction utilitaire : compte les suivis existants pour générer le prochain numéro d'id
// Exemple : 3 suivis existent → le prochain sera TRK-4
function getNextId() {
    const row = db.prepare("SELECT COUNT(*) as count FROM tracks").get();
    return row.count + 1;
}


// ========================
// 2. CHARGEMENT DU FICHIER .PROTO
// Le fichier .proto = le contrat de communication entre services
// Il définit les messages et les fonctions disponibles
// ========================

// On construit le chemin absolu vers le fichier proto
const PROTO_PATH = path.join(__dirname, "../proto/tracking.proto");

// On lit et charge le fichier proto avec ses options
const packageDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,  // garde les noms de champs tels quels
    longs: String,   // les grands nombres sont traités comme du texte
    enums: String,   // les énumérations aussi
    defaults: true,  // inclut les valeurs par défaut si absentes
    oneofs: true     // gère les champs "un parmi plusieurs"
});

// On extrait le package "tracking" du proto chargé
const trackingPackage = grpc.loadPackageDefinition(packageDef).tracking;


// ========================
// 3. FONCTIONS gRPC — ce que le service sait faire
// Ces fonctions sont appelées par la Gateway quand elle reçoit une requête
// ========================

// --- Créer un suivi pour une commande ---
// Appelée quand on fait POST /track via la gateway
// Exemple : on vient de créer la commande n°42, on démarre son suivi
function TrackOrder(call, callback) {
    const { order_id } = call.request; // identifiant de la commande à suivre

    // On génère un id unique pour ce suivi : "TRK-1", "TRK-2", etc.
    const id = "TRK-" + getNextId();

    // On prépare l'objet suivi avec ses valeurs initiales
    const track = {
        id,
        order_id,
        location: "Entrepôt central", // position de départ par défaut
        status: "en cours",           // statut initial
    };

    // On sauvegarde le suivi dans la base de données
    db.prepare(
        "INSERT INTO tracks (id, order_id, location, status) VALUES (?, ?, ?, ?)"
    ).run(track.id, track.order_id, track.location, track.status);

    console.log("📍 [gRPC] Suivi créé et persisté pour commande:", order_id);
    callback(null, track); // on renvoie le suivi créé (null = pas d'erreur)
}

// --- Voir tous les suivis ---
// Appelée quand on fait GET /track via la gateway
function GetAllTracks(call, callback) {
    // .all() renvoie toutes les lignes de la table sous forme de tableau
    const tracks = db.prepare("SELECT * FROM tracks").all();

    console.log("📍 [gRPC] Envoi de tous les suivis — Total:", tracks.length);

    // On renvoie { tracks: [...] } car gRPC attend ce format (défini dans le .proto)
    callback(null, { tracks });
}

// --- Mettre à jour la position et le statut d'un suivi ---
// Appelée quand on fait PUT /track/:id via la gateway
// Exemple : le colis vient d'arriver à Lyon, on met à jour sa position
function UpdateLocation(call, callback) {
    const { id, location, status } = call.request; // id du suivi + nouvelle position + nouveau statut

    // On vérifie d'abord que le suivi existe dans la base
    const existing = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id);

    // Si le suivi n'existe pas, on renvoie une erreur
    if (!existing) {
        return callback({
            code: grpc.status.NOT_FOUND, // code gRPC "introuvable"
            message: "Suivi non trouvé",
        });
    }

    // On met à jour la position et le statut
    // status || existing.status = si un nouveau statut est fourni on le prend,
    // sinon on garde l'ancien (pour ne pas l'effacer accidentellement)
    db.prepare(
        "UPDATE tracks SET location = ?, status = ? WHERE id = ?"
    ).run(location, status || existing.status, id);

    // On relit le suivi mis à jour pour le renvoyer complet
    const updated = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id);

    console.log("✅ [gRPC] Localisation mise à jour:", id, "->", location);
    callback(null, updated); // on renvoie le suivi avec sa nouvelle position
}


// ========================
// 4. DÉMARRAGE DU SERVEUR gRPC
// On crée le serveur, on enregistre les fonctions, et on l'ouvre sur le port 50053
// ========================

// Création du serveur gRPC
const server = new grpc.Server();

// On dit au serveur quelles fonctions il doit exposer
server.addService(trackingPackage.TrackingService.service, {
    TrackOrder,      // créer un suivi
    GetAllTracks,    // voir tous les suivis
    UpdateLocation,  // mettre à jour position et statut
});

// On démarre le serveur sur le port 50053
// 0.0.0.0 = accessible depuis toutes les interfaces réseau (pas seulement localhost)
server.bindAsync(
    "0.0.0.0:50053",
    grpc.ServerCredentials.createInsecure(), // pas de chiffrement (OK pour développement local)
    (err, port) => {
        if (err) {
            console.error("❌ Erreur démarrage:", err);
            return; // on arrête si le démarrage échoue
        }
        console.log(`📍 Tracking Service en ligne sur le port ${port}`);
        console.log(`💾 Base de données SQLite: tracking.db`);
        // pas de Kafka ici — ce service fonctionne uniquement en gRPC
    }
);
