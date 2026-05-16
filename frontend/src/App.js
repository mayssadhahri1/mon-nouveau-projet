import { useState, useEffect } from "react";

const API = "http://localhost:3000"; // Votre API Gateway

const TABS = [
  { id: "orders", label: "Commandes", icon: "📦" },
  { id: "delivery", label: "Livraisons", icon: "🚚" },
  { id: "tracking", label: "Suivi", icon: "📍" },
  { id: "graphql", label: "GraphQL", icon: "🔮" },
  { id: "arch", label: "Architecture", icon: "🗺️" },
];

const STATUS_COLORS = {
  pending: { bg: "#FFF8E1", text: "#E65100", label: "En attente" },
  assigned: { bg: "#E3F2FD", text: "#1565C0", label: "Assigné" },
  shipped: { bg: "#E8F5E9", text: "#2E7D32", label: "Expédié" },
  delivered: { bg: "#F3E5F5", text: "#6A1B9A", label: "Livré" },
  ready_for_pickup: { bg: "#E0F7FA", text: "#00695C", label: "Prêt" },
  "en cours": { bg: "#FFF3E0", text: "#BF360C", label: "En cours" },
};

// ─── COMPOSANT DE VAGUE CORRIGÉ ─────────────────────────────────────────────
function WaveSeparator() {
  return (
    <svg 
      viewBox="0 0 100 500" 
      preserveAspectRatio="none" 
      style={{ height: "100%", width: "80px", display: "block" }}
    >
      <path d="M100,0 C60,120 40,180 70,300 C90,380 40,460 100,500 Z" fill="#ffffff" />
      <path d="M100,0 C40,90 20,170 50,290 C70,370 20,450 100,500 Z" fill="#ffffff" opacity="0.15" />
      <path d="M100,0 C20,70 0,150 30,280 C50,360 0,440 100,500 Z" fill="#ffffff" opacity="0.1" />
    </svg>
  );
}

// ─── COMPOSANT AUTHENTIFICATION (DESIGN CORRIGÉ ET RESPONSIVE) ───────────────
function AuthForm({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const endpoint = isLogin ? "/auth/login" : "/auth/register";

    try {
      const r = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await r.json();

      if (!r.ok) throw new Error(data.error || "Une erreur est survenue");

      if (isLogin) {
        setMsg("✅ Connexion réussie !");
        setTimeout(() => {
          onLoginSuccess(data.user || { email }); 
        }, 1000);
      } else {
        setMsg("✅ Inscription réussie ! Vous pouvez vous connecter.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "85vh", padding: "20px" }}>
      <div style={{ display: "flex", width: "100%", maxWidth: "940px", minHeight: "550px", backgroundColor: "#ffffff", borderRadius: "30px", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)", overflow: "hidden", position: "relative" }}>
        
        {/* 🟦 PANNEAU GAUCHE */}
        <div style={{ 
          flex: "1", 
          background: "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)", 
          color: "#ffffff", 
          padding: "40px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          textAlign: "center",
          position: "relative"
        }}>
          <p style={{ fontSize: "14px", letterSpacing: "2px", marginBottom: "20px", opacity: 0.8, fontWeight: "500" }}>WELCOME TO</p>
          <div style={{ width: "90px", height: "90px", backgroundColor: "rgba(255, 255, 255, 0.2)", backdropFilter: "blur(5px)", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "45px" }}>🚀</span>
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: "700", margin: "0 0 15px", letterSpacing: "1px" }}>Spacer</h1>
          <p style={{ fontSize: "13px", lineHeight: "1.6", maxWidth: "300px", opacity: 0.8, margin: "0 0 30px" }}>
            Système de gestion et de suivi de livraison en temps réel.
          </p>
        </div>

        {/* 🌊 SÉPARATEUR DE VAGUE */}
        <div style={{ position: "absolute", left: "calc(50% - 40px)", top: 0, height: "100%", zIndex: 4, pointerEvents: "none" }}>
          <WaveSeparator />
        </div>

        {/* ⬜ PANNEAU DROIT (FORMULAIRE) */}
        <div style={{ flex: "1", backgroundColor: "#ffffff", padding: "50px 60px 50px 80px", display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 3 }}>
          <h2 style={{ fontSize: "28px", color: "#111827", fontWeight: "700", marginBottom: "30px" }}>
            {isLogin ? "Sign In to Spacer" : "Create your account"}
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            {!isLogin && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label style={{ fontSize: "13px", color: "#374151", fontWeight: "600", marginBottom: "6px" }}>Name</label>
                <input type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required style={{ border: "none", borderBottom: "2px solid #E5E7EB", padding: "8px 0", fontSize: "14px", outline: "none" }} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", color: "#374151", fontWeight: "600", marginBottom: "6px" }}>E-mail Address</label>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ border: "none", borderBottom: "2px solid #E5E7EB", padding: "8px 0", fontSize: "14px", outline: "none" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", color: "#374151", fontWeight: "600", marginBottom: "6px" }}>Password</label>
              <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ border: "none", borderBottom: "2px solid #E5E7EB", padding: "8px 0", fontSize: "14px", outline: "none" }} />
            </div>

            <div style={{ display: "flex", gap: "15px", marginTop: "15px" }}>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: "14px", borderRadius: "30px", fontSize: "14px", fontWeight: "700", border: "none", cursor: "pointer", background: "#1565C0", color: "#fff" }}>
                {loading ? "Process..." : isLogin ? "Sign In" : "Sign Up"}
              </button>
              <button type="button" onClick={() => { setIsLogin(!isLogin); setMsg(""); }} style={{ flex: 1, padding: "14px", borderRadius: "30px", fontSize: "14px", fontWeight: "700", cursor: "pointer", background: "#ffffff", color: "#1565C0", border: "2px solid #1565C0" }}>
                {isLogin ? "Register" : "I have account"}
              </button>
            </div>
          </form>

          {msg && <p style={{ marginTop: "20px", fontSize: "14px", textAlign: "center", fontWeight: "600", color: "#111827" }}>{msg}</p>}
        </div>

      </div>
    </div>
  );
}

// ─── COMPOSANTS UTILITAIRES ──────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#F5F5F5", text: "#616161", label: status };
  return (
    <span style={{ background: s.bg, color: s.text, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {s.label || status}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px", ...style }}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required style={{ width: "100%", padding: "9px 13px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, outline: "none", boxSizing: "border-box", background: "#F9FAFB" }} />
    </div>
  );
}

// ─── ORDERS TAB ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const fetchOrders = () => fetch(`${API}/orders`).then(r => r.json()).then(setOrders).catch(() => {});
  useEffect(() => { fetchOrders(); }, []);

  const handleOrderSubmit = async () => {
    setLoading(true);
    setMsg("");
    try {
      if (isEditing) {
        const r = await fetch(`${API}/orders/${editingOrderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        if (!r.ok) throw new Error();
        setMsg(`✅ Statut de la commande #${editingOrderId} mis à jour !`);
        setIsEditing(false);
        setEditingOrderId(null);
      } else {
        if (!product || !quantity) return;
        const r = await fetch(`${API}/orders`, {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, quantity: parseInt(quantity) })
        });
        const data = await r.json();
        setMsg(`✅ Commande #${data.id} créée — Kafka notifie Nour !`);
      }
      setProduct(""); setQuantity(""); setStatus("pending");
      fetchOrders();
    } catch { 
      setMsg("❌ Erreur de communication avec le serveur"); 
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      <Card>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, color: "#111827" }}>
          {isEditing ? `✏️ Modifier Statut #${editingOrderId}` : "✏️ Nouvelle commande"}
        </h3>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>Mayssa — Order Service · port 50051</p>
        
        {!isEditing ? (
          <>
            <Input label="Produit" value={product} onChange={setProduct} placeholder="Ex: Laptop" />
            <Input label="Quantité" value={quantity} onChange={setQuantity} placeholder="Ex: 2" type="number" />
          </>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Nouveau Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #D1D5DB", fontSize: 14, background: "#F9FAFB" }}>
              <option value="pending">En attente</option>
              <option value="assigned">Assigné</option>
              <option value="shipped">Expédié</option>
              <option value="delivered">Livré</option>
            </select>
          </div>
        )}
        
        <button onClick={handleOrderSubmit} disabled={loading || (!isEditing && (!product || !quantity))} style={{ width: "100%", background: isEditing ? "#F59E0B" : "#2563EB", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Envoi..." : isEditing ? "Mettre à jour" : "Créer la commande"}
        </button>
        {msg && <p style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>{msg}</p>}
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>📋 Toutes les commandes</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#F3F4F6" }}>
              {["ID", "Produit", "Quantité", "Statut", "Action"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "#2563EB" }}>#{o.id}</td>
                <td style={{ padding: "10px 12px" }}>{o.product}</td>
                <td style={{ padding: "10px 12px" }}>{o.quantity}</td>
                <td style={{ padding: "10px 12px" }}><Badge status={o.status} /></td>
                <td style={{ padding: "10px 12px" }}>
                  <button onClick={() => { setIsEditing(true); setEditingOrderId(o.id); setStatus(o.status); }} style={{ background: "#EFF6FF", color: "#1E4ED8", border: "1px solid #BFDBFE", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}>✏️ Statut</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={fetchOrders} style={{ marginTop: 14, background: "none", border: "1px solid #D1D5DB", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>🔄 Actualiser</button>
      </Card>
    </div>
  );
}

// ─── DELIVERY TAB ─────────────────────────────────────────────────────────────
function DeliveryTab() {
  const [deliveries, setDeliveries] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState("");

  const fetchDeliveries = () => fetch(`${API}/delivery`).then(r => r.json()).then(setDeliveries).catch(() => {});
  useEffect(() => { fetchDeliveries(); }, []);

  const assignDelivery = async () => {
    try {
      const r = await fetch(`${API}/delivery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: parseInt(orderId), address })
      });
      const d = await r.json();
      setMsg(`✅ Livraison ${d.id} assignée`);
      setOrderId(""); setAddress("");
      fetchDeliveries();
    } catch { setMsg("❌ Erreur"); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      <Card>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, color: "#111827" }}>🚚 Assigner livraison</h3>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>Nour — Delivery Service · port 50052</p>
        <Input label="ID Commande" value={orderId} onChange={setOrderId} placeholder="Ex: 1" type="number" />
        <Input label="Adresse" value={address} onChange={setAddress} placeholder="Ex: 12 rue de Paris" />
        <button onClick={assignDelivery} style={{ width: "100%", background: "#059669", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>Assigner</button>
        {msg && <p style={{ marginTop: 12, fontSize: 13 }}>{msg}</p>}
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>📋 Toutes les livraisons</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#F3F4F6" }}>
              {["ID", "Commande", "Adresse", "Statut"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveries.map(d => (
              <tr key={d.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "#059669" }}>{d.id}</td>
                <td style={{ padding: "10px 12px" }}>#{d.order_id}</td>
                <td style={{ padding: "10px 12px" }}>{d.address}</td>
                <td style={{ padding: "10px 12px" }}><Badge status={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── TRACKING TAB (CORRIGÉ POUR EVITER LE UNDEFINED) ──────────────────────────
function TrackingTab() {
  const [tracks, setTracks] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [msg, setMsg] = useState("");

  const fetchTracks = () => fetch(`${API}/track`).then(r => r.json()).then(setTracks).catch(() => {});
  useEffect(() => { fetchTracks(); }, []);

  const trackOrder = async () => {
    try {
      const r = await fetch(`${API}/track`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: parseInt(orderId) })
      });
      const d = await r.json();
      
      // FIX TECHNIQUE : On vérifie si d.location existe, sinon on utilise une valeur de secours
      const locationText = d.location || d.localisation || `Commande #${orderId}`;
      setMsg(`✅ Suivi créé — ${locationText}`);
      
      setOrderId("");
      fetchTracks();
    } catch { setMsg("❌ Erreur lors de la création du suivi"); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      <Card>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, color: "#111827" }}>📍 Créer un suivi</h3>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>Tracking Service · port 50053</p>
        <Input label="ID Commande" value={orderId} onChange={setOrderId} placeholder="Ex: 1" type="number" />
        <button onClick={trackOrder} style={{ width: "100%", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>Suivre</button>
        {msg && <p style={{ marginTop: 12, fontSize: 13, color: "#374151", fontWeight: "600" }}>{msg}</p>}
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>📋 Tous les suivis</h3>
        {tracks.length === 0 ? (
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Aucun suivi enregistré.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F3F4F6" }}>
                {["ID", "Commande", "Localisation", "Statut"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tracks.map(t => (
                <tr key={t.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#7C3AED" }}>{t.id}</td>
                  <td style={{ padding: "10px 12px" }}>#{t.order_id}</td>
                  <td style={{ padding: "10px 12px" }}>{t.location || t.localisation || "N/A"}</td>
                  <td style={{ padding: "10px 12px" }}><Badge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button onClick={fetchTracks} style={{ marginTop: 14, background: "none", border: "1px solid #D1D5DB", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>🔄 Actualiser</button>
      </Card>
    </div>
  );
}

// ─── GRAPHQL TAB ──────────────────────────────────────────────────────────────
const GQL_EXAMPLES = [
  { label: "getOrders", query: `query {\n  getOrders {\n    id\n    product\n    quantity\n    status\n  }\n}` },
  { label: "getDeliveries", query: `query {\n  getDeliveries {\n    id\n    order_id\n    address\n    status\n  }\n}` },
];

function GraphQLTab() {
  const [query, setQuery] = useState(GQL_EXAMPLES[0].query);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/graphql`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const d = await r.json();
      setResult(JSON.stringify(d, null, 2));
    } catch (e) { setResult("❌ Erreur : " + e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {GQL_EXAMPLES.map(ex => <button key={ex.label} onClick={() => setQuery(ex.query)} style={{ background: "#EEF2FF", color: "#4338CA", border: "1px solid #C7D2FE", borderRadius: 20, padding: "5px 14px", cursor: "pointer" }}>{ex.label}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ background: "#1E1E2E", padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#CDD6F4" }}>🔮 Requête GraphQL</span>
            <button onClick={runQuery} style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>▶ Exécuter</button>
          </div>
          <textarea value={query} onChange={e => setQuery(e.target.value)} style={{ width: "100%", minHeight: 240, background: "#1E1E2E", color: "#A6E3A1", border: "none", padding: "16px", fontFamily: "monospace" }} />
        </Card>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <pre style={{ margin: 0, padding: "16px", background: "#1E1E2E", color: "#89DCEB", minHeight: 240, overflow: "auto", fontFamily: "monospace" }}>{result || "← Exécutez une requête"}</pre>
        </Card>
      </div>
    </div>
  );
}

// ─── ARCHITECTURE TAB ─────────────────────────────────────────────────────────
function ArchTab() {
  return (
    <Card>
      <h3>🗺️ Schéma d'architecture</h3>
      <p style={{ color: "#6B7280" }}>Microservices connectés via gRPC et synchronisés en arrière-plan grâce à Apache Kafka.</p>
    </Card>
  );
}

// ─── COMPOSANT GENERAL ────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("orders");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("app_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#F9FAFB", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "16px 32px", display: "flex", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🚚 Système de Livraison en Temps Réel</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>SOA & Microservices — Mayssa & Nour</p>
        </div>
        {user && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13 }}>👤 <b>{user.email}</b></span>
            <button onClick={() => { setUser(null); localStorage.removeItem("app_user"); }} style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Quitter</button>
          </div>
        )}
      </div>

      {!user ? (
        <AuthForm onLoginSuccess={(u) => { setUser(u); localStorage.setItem("app_user", JSON.stringify(u)); }} />
      ) : (
        <>
          <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 32px", display: "flex", gap: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "14px 18px", color: tab === t.id ? "#2563EB" : "#6B7280", borderBottom: tab === t.id ? "2px solid #2563EB" : "2px solid transparent", fontWeight: tab === t.id ? 600 : 400 }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "24px 32px" }}>
            {tab === "orders" && <OrdersTab />}
            {tab === "delivery" && <DeliveryTab />}
            {tab === "tracking" && <TrackingTab />}
            {tab === "graphql" && <GraphQLTab />}
            {tab === "arch" && <ArchTab />}
          </div>
        </>
      )}
    </div>
  );
}