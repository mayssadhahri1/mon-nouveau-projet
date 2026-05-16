
// Permet de créer le serveur microservice
const grpc = require("@grpc/grpc-js");
// Permet de charger les fichiers .proto
const protoLoader = require("@grpc/proto-loader");

// Sert à construire les chemins des fichiers
const path = require("path");

const Database = require("better-sqlite3");

const db = new Database("tracking.db");


// Création automatique table tracks
db.exec(`

    CREATE TABLE IF NOT EXISTS tracks (

        // ID unique du suivi
        // Exemple : TRK-1
        id TEXT PRIMARY KEY,

        // ID commande associée
        order_id INTEGER,

        // Position actuelle colis
        location TEXT DEFAULT 'Entrepôt central',

        // Statut livraison
        status TEXT DEFAULT 'en cours'
    )
`);
// GÉNÉRATION ID SUIVI
// Fonction qui génère le prochain ID
function getNextId() {

    // Compte le nombre de suivis
    const row = db
        .prepare(

            "SELECT COUNT(*) as count FROM tracks"
        )
        .get();

    // Retour prochain numéro
    return row.count + 1;
}
// 2. CHARGEMENT FICHIER PROTO
// Construction chemin proto
const PROTO_PATH = path.join(

    __dirname,

    "../proto/tracking.proto"
);


// Chargement du fichier proto
const packageDef = protoLoader.loadSync(

    PROTO_PATH,

    {
        keepCase: true,

        longs: String,

        enums: String,

        defaults: true,

        oneofs: true
    }
);


// Extraction package tracking
const trackingPackage = grpc
    .loadPackageDefinition(packageDef)
    .tracking;

// TRACK ORDER Créer un nouveau suivi colis

function TrackOrder(call, callback) {
    // DONNÉES REÇUES
    const { order_id } = call.request;
    // GÉNÉRATION ID

    const id = "TRK-" + getNextId();
    // OBJET TRACKING

    const track = {
        id,
        order_id,
        // Position initiale
        location: "Entrepôt central",
        status: "en cours",
    };
    // INSERTION SQLITE
 
    db.prepare(

        `
        INSERT INTO tracks
        (id, order_id, location, status)
        VALUES (?, ?, ?, ?)
        `
    ).run(

        track.id,
        track.order_id,
        track.location,
        track.status
    );
    // LOG SUCCÈS

    console.log(

        "📍 [gRPC] Suivi créé pour commande:",

        order_id
    );


    // Retour suivi créé
    callback(null, track);
}
// Voir tous les suivis

function GetAllTracks(call, callback) {
    // LECTURE SQLITE

    const tracks = db
        .prepare(

            "SELECT * FROM tracks"
        )
        .all();
    // LOG TOTAL

    console.log(

        "📍 [gRPC] Nombre suivis:",

        tracks.length
    );
    // RETOUR RÉSULTAT
    callback(null, {

        tracks
    });
}
// Modifier position et statut

function UpdateLocation(call, callback) {

    // PARAMÈTRES REÇUS
    const { id, location, status } = call.request;

    // RECHERCHE SUIVi
    const existing = db
        .prepare(

            "SELECT * FROM tracks WHERE id = ?"
        )
        .get(id);
    // SUIVI INTROUVABLE

    if (!existing) {

        return callback({

            code: grpc.status.NOT_FOUND,

            message: "Suivi non trouvé",
        });
    }
    // MISE À JOUR SQLITE
    db.prepare(

        `
        UPDATE tracks
        SET location = ?, status = ?
        WHERE id = ?
        `
    ).run(

        // Nouvelle position
        location,

        // Nouveau statut
        // Sinon ancien statut
        status || existing.status,
        id
    );
    // RELECTURE DONNÉES
    const updated = db
        .prepare(

            "SELECT * FROM tracks WHERE id = ?"
        )
        .get(id);
    // LOG SUCCÈS
    console.log(

        "✅ [gRPC] Position mise à jour:",

        id,

        "->",

        location
    );


    // Retour données mises à jour
    callback(null, updated);
}
// Création serveur gRPC
const server = new grpc.Server();
// ENREGISTREMENT SERVICES
server.addService(

    trackingPackage.TrackingService.service,

    {
        TrackOrder,
        GetAllTracks,
        UpdateLocation,
    }
);
// Démarrage serveur port 50053
server.bindAsync(

    // Adresse réseau
    "0.0.0.0:50053",

    // Pas de SSL
    grpc.ServerCredentials.createInsecure(),


    // Callback démarrage
    (err, port) => {
        if (err) {

            console.error(

                "❌ Erreur démarrage:",

                err
            );

            return;
        }
        // LOG SUCCÈS
        console.log(

            `📍 Tracking Service actif sur port ${port}`
        );

        console.log(

            `💾 SQLite DB : tracking.db`
        );

        console.log(

            "📡 Service utilise uniquement gRPC"
        );
    }
);

// Ce microservice permet :
//
// 1. Créer un suivi colis
// 2. Voir tous les suivis
// 3. Modifier position colis
// 4. Modifier statut livraison
// 5. Stocker les suivis dans SQLite
// 6. Communiquer avec la Gateway via gRPC
//
// Exemple:
//
// Commande créée
// ↓
// Tracking Service crée :
//
// TRK-1
// Position : Entrepôt central
// Statut   : en cours
//
// Ensuite le livreur peut mettre à jour :
//
// Position : Tunis
// Statut   : en livraison
//
// Puis :
//
// Position : Chez client
// Statut   : livré
//
// Ce service joue le rôle du système
// de suivi en temps réel des colis.