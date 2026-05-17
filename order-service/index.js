
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const Database = require("better-sqlite3");
const { Kafka } = require("kafkajs");
const db = new Database("orders.db");

// Création automatique table orders
db.exec(`

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product TEXT,
        quantity INTEGER,
        status TEXT DEFAULT 'pending'
    )
`);

// Création connexion Kafka
const kafka = new Kafka({

    // Nom client Kafka
    clientId: "order-service",

    // Adresse broker Kafka
    brokers: ["localhost:9092"],
});
// Producer = expéditeur messages
const producer = kafka.producer();
// Fonction connexion producer Kafka
async function startProducer() {

    try {

        // Connexion broker Kafka
        await producer.connect();

        console.log(

            "📡 Kafka Producer connecté"
        );

    } catch (err) {
        console.error(

            "⚠️ Kafka indisponible:",

            err.message
        );
    }
}
// Fonction utilitaire pour publier un message
async function sendToKafka(topic, message) {

    try {

        // Envoi message Kafka
        await producer.send({

            // Nom du topic
            topic: topic,

            // Messages envoyés
            messages: [

                {
                    // Conversion objet -> JSON
                    value: JSON.stringify(message)
                }
            ],
        });


    
        // LOG SUCCÈS
      

        console.log(

            `📡 Message envoyé vers ${topic}:`,

            message
        );

    } catch (error) {


        // ERREUR KAFKA
    

        console.error(

            "⚠️ Erreur Kafka:",

            error.message
        );
    }
}


// 3. CHARGEMENT FICHIER PROTO



// Chargement order.proto
const packageDef = protoLoader.loadSync(

    "../proto/order.proto",

    {
        keepCase: true,

        longs: String,

        enums: String,

        defaults: true,

        oneofs: true
    }
);


// Extraction package order
const orderPackage = grpc
    .loadPackageDefinition(packageDef)
    .order;
// 4. FONCTIONS gRPC
async function CreateOrder(call, callback) {

    // Récupération données requête
    const { product, quantity } = call.request;

    try {

        // INSERTION SQLITE
      

        const stmt = db.prepare(

            `
            INSERT INTO orders
            (product, quantity, status)
            VALUES (?, ?, 'pending')
            `
        );


        // Exécution insertion
        const result = stmt.run(

            product,
            quantity
        );


        
        // OBJET COMMANDE

        const newOrder = {

            // ID généré SQLite
            id: result.lastInsertRowid,

            // Produit
            product,

            // Quantité
            quantity,

            // Statut initial
            status: "pending",
        };


        // LOG SUCCÈS

        console.log(

            "✅ Commande créée:",

            newOrder
        );
        // ENVOI KAFKA
        // Notifie les autres services
        await sendToKafka(

            "order-topic",

            newOrder
        );


        // Retour réponse gRPC
        callback(null, newOrder);

    } catch (err) {
        // ERREUR CREATE ORDER
        console.error(

            "❌ Erreur CreateOrder:",

            err.message
        );


        callback({

            code: grpc.status.INTERNAL,

            message: err.message
        });
    }
}
// Récupérer une commande par ID

function GetOrder(call, callback) {

    try {

        // Recherche commande SQLite
        const order = db
            .prepare(

                "SELECT * FROM orders WHERE id = ?"
            )
            .get(call.request.id);
        // COMMANDE INTROUVABLE
  
        if (!order) {

            return callback({

                code: grpc.status.NOT_FOUND,

                message: "Commande non trouvée",
            });
        }


        // Retour commande trouvée
        callback(null, order);

    } catch (err) {

        callback({

            code: grpc.status.INTERNAL,

            message: err.message
        });
    }
}
// GET ORDERS
function GetOrders(call, callback) {

    try {

        // Lecture complète table orders
        const orders = db
            .prepare(

                "SELECT * FROM orders"
            )
            .all();


        // Retour tableau commandes
        callback(null, {

            orders
        });

    } catch (err) {

        callback({

            code: grpc.status.INTERNAL,

            message: err.message
        });
    }
}
// Modifier statut commande
async function UpdateOrder(call, callback) {

    // Récupération paramètres
    const { id, status } = call.request;

    try {
        // UPDATE SQLITE
        db.prepare(

            "UPDATE orders SET status = ? WHERE id = ?"

        ).run(status, id);
        // RELECTURE COMMANDE
        const order = db
            .prepare(

                "SELECT * FROM orders WHERE id = ?"
            )
            .get(id);
        // COMMANDE INTROUVABLE
        if (!order) {

            return callback({

                code: grpc.status.NOT_FOUND,

                message: "Commande non trouvée",
            });
        }
        // NOTIFICATION KAFKA
        await sendToKafka(

            "order-topic",

            {

                // Type événement
                event: "ORDER_UPDATED",

                // Données commande
                ...order,
            }
        );
        // LOG SUCCÈS
        console.log(

            "✅ Commande mise à jour:",

            order
        );


        // Retour commande mise à jour
        callback(null, order);

    } catch (err) {

        callback({

            code: grpc.status.INTERNAL,

            message: err.message
        });
    }
}
function DeleteOrder(call, callback) {

    try {
        // DELETE SQLITE
        db.prepare(

            "DELETE FROM orders WHERE id = ?"

        ).run(call.request.id);
        // LOG SUPPRESSION
        console.log(

            "🗑️ Commande supprimée:",

            call.request.id
        );
        // Retour message confirmation
        callback(null, {

            message: "Order deleted successfully"
        });

    } catch (err) {

        callback({

            code: grpc.status.INTERNAL,

            message: err.message
        });
    }
}
// Création serveur gRPC
const server = new grpc.Server();
server.addService(

    orderPackage.OrderService.service,

    {
        CreateOrder,
        GetOrder,
        GetOrders,
        UpdateOrder,
        DeleteOrder,
    }
);
server.bindAsync(
    // Adresse réseau
    "0.0.0.0:50051",

    // Pas de SSL/TLS
    grpc.ServerCredentials.createInsecure(),

    // Callback démarrage
    async (err, port) => {
        // ERREUR DÉMARRAGE
        if (err) {

            console.error(

                "❌ Erreur démarrage serveur:",

                err
            );

            return;
        }
        // CONNEXION KAFKA

        await startProducer();
        console.log(

            `📦 Order Service actif sur port ${port}`
        );

        console.log(

            `💾 SQLite DB : orders.db`
        );
    }
);