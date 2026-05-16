
const express = require("express");
const cors = require("cors");
// Base de données SQLite
// .verbose() permet d’avoir plus de détails en cas d’erreur
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// Création de l’application Express
const app = express();
const PORT = 4001;

// Clé secrète utilisée pour signer les tokens JWT
const JWT_SECRET = "spacer-secret-2024";

// Active CORS
app.use(cors());

// Permet de lire les données JSON envoyées par le frontend
app.use(express.json());

// Création / connexion à la base auth.db
const db = new sqlite3.Database("auth.db", (err) => {

    // Gestion erreur connexion DB
    if (err)

        console.error(
            "❌ Erreur DB:",
            err.message
        );
    else

        console.log(
            "💾 Base de données auth.db connectée"
        );
});

db.run(`

    CREATE TABLE IF NOT EXISTS users (

        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`);

app.post("/register", async (req, res) => {
    // Récupération données frontend
    const { name, email, password } = req.body;
    if (!email || !password)

        return res.status(400).json({

            error: "Email et mot de passe requis"
        });


    try {
        // Cryptage du mot de passe
        const hash = await bcrypt.hash(password, 10);

        // INSERTION UTILISATEUR
        db.run(

            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name || "", email, hash],

            // Callback après insertion
            function (err) {

                if (err) {

                    // Email déjà utilisé
                    if (err.message.includes("UNIQUE"))

                        return res.status(409).json({

                            error: "Cet email est déjà utilisé"
                        });
                    return res.status(500).json({

                        error: "Erreur serveur"
                    });
                }

                res.status(201).json({

                    message: "Compte créé avec succès",

                    user: {

                        id: this.lastID,

                        email,

                        // Nom utilisateur
                        name: name || ""
                    },
                });
            }
        );

    } catch {
        res.status(500).json({

            error: "Erreur serveur"
        });
    }
});
app.post("/login", async (req, res) => {

    // Récupération 
    const { email, password } = req.body;


    // Vérification champs obligatoires
    if (!email || !password)

        return res.status(400).json({

            error: "Email et mot de passe requis"
        });
    db.get(

        // Requête SQL
        "SELECT * FROM users WHERE email = ?",

        // Paramètre
        [email],

        // Callback résultat
        async (err, user) => {

            // Erreur base de données
            if (err)

                return res.status(500).json({

                    error: "Erreur serveur"
                });


            // Utilisateur introuvable
            if (!user)

                return res.status(401).json({

                    error: "Email ou mot de passe incorrect"
                });


            try {

                // VÉRIFICATION PASSWORD
                // Compare password saisi avec password hashé
                const ok = await bcrypt.compare(

                    password,
                    user.password
                );


                // Mot de passe incorrect
                if (!ok)

                    return res.status(401).json({

                        error: "Email ou mot de passe incorrect"
                    });
                // GÉNÉRATION TOKEN JWT
                const token = jwt.sign(

                    // Données stockées dans le token
                    {
                        id: user.id,
                        email: user.email
                    },

                    // Clé secrète
                    JWT_SECRET,

                    // Expiration token
                    {
                        expiresIn: "24h"
                    }
                );
                // RÉPONSE SUCCÈS LOGIN
                res.json({

                    message: "Connexion réussie",

                    // Token JWT
                    token,

                    // Informations utilisateur
                    user: {

                        id: user.id,

                        email: user.email,

                        name: user.name
                    },
                });

            } catch {

                // Erreur globale
                res.status(500).json({

                    error: "Erreur serveur"
                });
            }
        }
    );
});

app.listen(PORT, () => {

    console.log(

        `🔐 Auth Service en ligne sur le port ${PORT}`
    );
});