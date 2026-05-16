// ============================================================
// AUTH SERVICE — Service d'authentification
// Utilise sqlite3 (pas better-sqlite3) — pas besoin de
// Visual Studio ni de compilation native sur Windows
// ============================================================

const express = require("express");
const cors    = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");

const app        = express();
const PORT       = 4001;
const JWT_SECRET = "spacer-secret-2024";

app.use(cors());
app.use(express.json());

// ========================
// BASE DE DONNÉES SQLite
// ========================
const db = new sqlite3.Database("auth.db", (err) => {
    if (err) console.error("❌ Erreur DB:", err.message);
    else     console.log("💾 Base de données auth.db connectée");
});

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT,
        email    TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`);

// ========================
// POST /register — créer un compte
// ========================
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: "Email et mot de passe requis" });

    try {
        const hash = await bcrypt.hash(password, 10);

        db.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name || "", email, hash],
            function (err) {
                if (err) {
                    if (err.message.includes("UNIQUE"))
                        return res.status(409).json({ error: "Cet email est déjà utilisé" });
                    return res.status(500).json({ error: "Erreur serveur" });
                }
                res.status(201).json({
                    message: "Compte créé avec succès",
                    user: { id: this.lastID, email, name: name || "" },
                });
            }
        );
    } catch {
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ========================
// POST /login — se connecter
// ========================
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ error: "Email et mot de passe requis" });

    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err)   return res.status(500).json({ error: "Erreur serveur" });
        if (!user) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

        try {
            const ok = await bcrypt.compare(password, user.password);
            if (!ok) return res.status(401).json({ error: "Email ou mot de passe incorrect" });

            const token = jwt.sign(
                { id: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: "24h" }
            );

            res.json({
                message: "Connexion réussie",
                token,
                user: { id: user.id, email: user.email, name: user.name },
            });
        } catch {
            res.status(500).json({ error: "Erreur serveur" });
        }
    });
});

// ========================
// DÉMARRAGE
// ========================
app.listen(PORT, () => {
    console.log(`🔐 Auth Service en ligne sur le port ${PORT}`);
});