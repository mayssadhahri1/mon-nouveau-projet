
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const Database = require("better-sqlite3");
// Permet d’écouter les messages Kafka
const { Kafka } = require("kafkajs");
const db = new Database("deliveries.db");

// Création automatique de la table deliveries
db.exec(`

    CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,
        order_id INTEGER,
        address TEXT,
        status TEXT DEFAULT 'assigned'
    )
`);
// Génère le prochain identifiant livraison
function getNextId() {
    // Compte le nombre de livraisons
    const row = db.prepare(

        "SELECT COUNT(*) as count FROM deliveries"

    ).get();
    return row.count + 1;
}
// Construction chemin vers delivery.proto
const PROTO_PATH = path.join(

    __dirname,
    "../proto/delivery.proto"
);


// Chargement fichier proto
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


// Extraction package delivery
const deliveryPackage = grpc
    .loadPackageDefinition(packageDef)
    .delivery;

// Création connexion Kafka
const kafka = new Kafka({

    // Nom du client Kafka
    clientId: "delivery-service",

    // Adresse broker Kafka
    brokers: ["localhost:9092"],
});

// CONSUMER KAFKA

// Consumer = écouteur messages
const consumer = kafka.consumer({

    // Groupe consommateurs Kafka
    groupId: "delivery-group"
});

// Cette fonction écoute les nouvelles commandes et crée automatiquement une livraison
async function runKafka() {

    try {

        // Connexion au broker Kafka
        await consumer.connect();


        // Abonnement au topic order-topic
        await consumer.subscribe({

            topic: "order-topic",

            fromBeginning: true
        });
        // Démarrage écoute messages
        await consumer.run({
            // Fonction exécutée à chaque message reçu
            eachMessage: async ({ message }) => {
                const order = JSON.parse(

                    message.value.toString()
                );
                // Vérifie si livraison auto existe déjà
                const existing = db
                    .prepare(

                        `
                        SELECT *
                        FROM deliveries
                        WHERE order_id = ?
                        AND id LIKE 'DEL-AUTO-%'
                        `
                    )
                    .get(order.id);


                // Livraison déjà créée
                if (existing) {

                    console.log(

                        " Livraison auto déjà existante:",
                        order.id
                    );

                    return;
                }

                console.log(

                    "📥 [Kafka] Commande reçue:",
                    order.id
                );


                const autoId =

                    "DEL-AUTO-" + getNextId();

                const autoDelivery = {

                    id: autoId,

                    order_id: order.id,

                    // Adresse provisoire
                    address: "En attente d'adresse (Kafka)",

                    // Statut livraison
                    status: "ready_for_pickup",
                };

                db.prepare(

                    `
                    INSERT OR IGNORE INTO deliveries
                    (id, order_id, address, status)
                    VALUES (?, ?, ?, ?)
                    `
                ).run(

                    autoDelivery.id,

                    autoDelivery.order_id,

                    autoDelivery.address,

                    autoDelivery.status
                );


                // ========================
                // LOG SUCCÈS
                // ========================

                console.log(

                    "✅ Livraison auto créée:",
                    autoDelivery.id
                );
            },
        });

    } catch (err) {


        console.log(

            "⚠️ Kafka non détecté:",

            err.message
        );
    }
}

// ASSIGN DELIVERY Créer une livraison manuellement


function AssignDelivery(call, callback) {

    // Récupération données requête
    const { order_id, address } = call.request;


    // Génération ID livraison
    const id = "DEL-" + getNextId();


    // Objet livraison
    const delivery = {

        id,

        order_id,

        // Adresse par défaut si vide
        address: address || "Adresse non fournie",

        // Statut initial
        status: "assigned",
    };

    db.prepare(

        `
        INSERT INTO deliveries
        (id, order_id, address, status)
        VALUES (?, ?, ?, ?)
        `
    ).run(

        delivery.id,

        delivery.order_id,

        delivery.address,

        delivery.status
    );

    console.log(

        "📦 [gRPC] Livraison créée:",
        delivery.id
    );


    // Retour réponse gRPC
    callback(null, delivery);
}

function GetDelivery(call, callback) {

    // Recherche livraison SQLite
    const delivery = db
        .prepare(

            "SELECT * FROM deliveries WHERE id = ?"
        )
        .get(call.request.id);
    // si introvable 
    if (!delivery) {

        return callback({

            // Code erreur gRPC
            code: grpc.status.NOT_FOUND,

            message: "Livraison non trouvée",
        });
    }


    // Retour livraison trouvée
    callback(null, delivery);
}

function GetDeliveries(call, callback) {

    // Lecture complète table deliveries
    const deliveries = db
        .prepare(

            "SELECT * FROM deliveries"
        )
        .all();

    console.log(

        "📊 Nombre livraisons:",

        deliveries.length
    );
    // Retour tableau livraisons
    callback(null, {

        deliveries
    });
}

function UpdateDeliveryStatus(call, callback) {

    // Récupération paramètres
    const { id, status } = call.request;

    const existing = db
        .prepare(

            "SELECT * FROM deliveries WHERE id = ?"
        )
        .get(id);


    // Livraison inexistante
    if (!existing) {

        return callback({

            code: grpc.status.NOT_FOUND,

            message: "Livraison non trouvée",
        });
    }

    db.prepare(

        "UPDATE deliveries SET status = ? WHERE id = ?"

    ).run(status, id);

    // RELECTURE DONNÉES


    const updated = db
        .prepare(

            "SELECT * FROM deliveries WHERE id = ?"
        )
        .get(id);


    // LOG SUCCÈS

    console.log(

        "✅ Statut modifié:",

        id,

        "->",

        status
    );


    // Retour livraison mise à jour
    callback(null, updated);
}
// Création serveur gRPC
const server = new grpc.Server();

// ENREGISTREMENT DES SERVICES

// On expose les fonctions du microservice
server.addService(

    deliveryPackage.DeliveryService.service,

    {

        // Création livraison
        AssignDelivery,

        // Récupérer livraison
        GetDelivery,

        // Liste livraisons
        GetDeliveries,

        // Modifier statut
        UpdateDeliveryStatus,
    }
);

server.bindAsync(

    // Adresse serveur
    "0.0.0.0:50052",

    // Pas de SSL/TLS
    grpc.ServerCredentials.createInsecure(),


    // Callback démarrage
    async (err, port) => {


        if (err) {

            console.error(

                "❌ Erreur démarrage:",

                err
            );

            return;
        }

        // LOG SUCCÈS
        console.log(

            `🚚 Delivery Service actif sur port ${port}`
        );

        console.log(

            `💾 SQLite DB : deliveries.db`
        );

        await runKafka();
    }
);