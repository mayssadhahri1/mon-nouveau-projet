import { useState, useEffect } from "react";

const API = "http://localhost:3000";

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

function Badge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#F5F5F5", text: "#616161", label: status };
  return (
    <span style={{
      background: s.bg, color: s.text,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap"
    }}>{s.label || status}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px",
      ...style
    }}>{children}</div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "9px 13px", borderRadius: 8,
          border: "1px solid #D1D5DB", fontSize: 14, outline: "none",
          boxSizing: "border-box", background: "#F9FAFB"
        }}
      />
    </div>
  );
}

function Btn({ onClick, children, color = "#2563EB", disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#9CA3AF" : color, color: "#fff",
      border: "none", borderRadius: 8, padding: "10px 20px",
      fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      transition: "opacity 0.15s"
    }}>{children}</button>
  );
}

// ─── ORDERS TAB ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchOrders = () =>
    fetch(`${API}/orders`).then(r => r.json()).then(setOrders).catch(() => {});

  useEffect(() => { fetchOrders(); }, []);

  const createOrder = async () => {
    if (!product || !quantity) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, quantity: parseInt(quantity) })
      });
      const data = await r.json();
      setMsg(`✅ Commande #${data.id} créée — Kafka notifie Nour !`);
      setProduct(""); setQuantity("");
      fetchOrders();
    } catch { setMsg("❌ Erreur — vérifiez que les services sont lancés"); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      <Card>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, color: "#111827" }}>✏️ Nouvelle commande</h3>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>
          Mayssa — Order Service · port 50051
        </p>
        <Input label="Produit" value={product} onChange={setProduct} placeholder="Ex: Laptop" />
        <Input label="Quantité" value={quantity} onChange={setQuantity} placeholder="Ex: 2" type="number" />
        <Btn onClick={createOrder} disabled={loading || !product || !quantity}>
          {loading ? "Envoi..." : "Créer la commande"}
        </Btn>
        {msg && <p style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>{msg}</p>}
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>📋 Toutes les commandes</h3>
        {orders.length === 0 ? (
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Aucune commande. Créez-en une !</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F3F4F6" }}>
                {["ID", "Produit", "Quantité", "Statut"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button onClick={fetchOrders} style={{
          marginTop: 14, background: "none", border: "1px solid #D1D5DB",
          borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "#374151"
        }}>🔄 Actualiser</button>
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

  const fetchDeliveries = () =>
    fetch(`${API}/delivery`).then(r => r.json()).then(setDeliveries).catch(() => {});

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
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>
          Nour — Delivery Service · port 50052
        </p>
        <Input label="ID Commande" value={orderId} onChange={setOrderId} placeholder="Ex: 1" type="number" />
        <Input label="Adresse" value={address} onChange={setAddress} placeholder="Ex: 12 rue de Paris" />
        <Btn onClick={assignDelivery} color="#059669">Assigner</Btn>
        {msg && <p style={{ marginTop: 12, fontSize: 13 }}>{msg}</p>}
        <div style={{ marginTop: 16, background: "#ECFDF5", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#065F46" }}>
          <strong>⚡ Kafka automatique :</strong> Les livraisons reçues via Kafka
          (quand Mayssa crée une commande) apparaissent aussi ici !
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>📋 Toutes les livraisons</h3>
        {deliveries.length === 0 ? (
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Aucune livraison pour l'instant.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F3F4F6" }}>
                {["ID", "Commande", "Adresse", "Statut"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#059669" }}>{d.id}</td>
                  <td style={{ padding: "10px 12px" }}>#{d.order_id}</td>
                  <td style={{ padding: "10px 12px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{d.address}</td>
                  <td style={{ padding: "10px 12px" }}><Badge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button onClick={fetchDeliveries} style={{
          marginTop: 14, background: "none", border: "1px solid #D1D5DB",
          borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "#374151"
        }}>🔄 Actualiser</button>
      </Card>
    </div>
  );
}

// ─── TRACKING TAB ─────────────────────────────────────────────────────────────
function TrackingTab() {
  const [tracks, setTracks] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [msg, setMsg] = useState("");

  const fetchTracks = () =>
    fetch(`${API}/track`).then(r => r.json()).then(setTracks).catch(() => {});

  useEffect(() => { fetchTracks(); }, []);

  const trackOrder = async () => {
    try {
      const r = await fetch(`${API}/track`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: parseInt(orderId) })
      });
      const d = await r.json();
      setMsg(`✅ Suivi créé — ${d.location}`);
      setOrderId("");
      fetchTracks();
    } catch { setMsg("❌ Erreur"); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      <Card>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, color: "#111827" }}>📍 Créer un suivi</h3>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>
          Tracking Service · port 50053
        </p>
        <Input label="ID Commande" value={orderId} onChange={setOrderId} placeholder="Ex: 1" type="number" />
        <Btn onClick={trackOrder} color="#7C3AED">Suivre</Btn>
        {msg && <p style={{ marginTop: 12, fontSize: 13 }}>{msg}</p>}
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>📋 Tous les suivis</h3>
        {tracks.length === 0 ? (
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Aucun suivi.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F3F4F6" }}>
                {["ID", "Commande", "Localisation", "Statut"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tracks.map(t => (
                <tr key={t.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: "#7C3AED" }}>{t.id}</td>
                  <td style={{ padding: "10px 12px" }}>#{t.order_id}</td>
                  <td style={{ padding: "10px 12px" }}>{t.location}</td>
                  <td style={{ padding: "10px 12px" }}><Badge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button onClick={fetchTracks} style={{
          marginTop: 14, background: "none", border: "1px solid #D1D5DB",
          borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "#374151"
        }}>🔄 Actualiser</button>
      </Card>
    </div>
  );
}

// ─── GRAPHQL TAB ──────────────────────────────────────────────────────────────
const GQL_EXAMPLES = [
  {
    label: "getOrders", desc: "Lister les commandes",
    query: `query {\n  getOrders {\n    id\n    product\n    quantity\n    status\n  }\n}`
  },
  {
    label: "getDeliveries", desc: "Lister les livraisons",
    query: `query {\n  getDeliveries {\n    id\n    order_id\n    address\n    status\n  }\n}`
  },
  {
    label: "getAllTracks", desc: "Lister les suivis",
    query: `query {\n  getAllTracks {\n    id\n    order_id\n    location\n    status\n  }\n}`
  },
  {
    label: "createOrder", desc: "Créer une commande",
    query: `mutation {\n  createOrder(product: "Laptop", quantity: 2) {\n    id\n    product\n    status\n  }\n}`
  },
];

function GraphQLTab() {
  const [query, setQuery] = useState(GQL_EXAMPLES[0].query);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/graphql`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const d = await r.json();
      setResult(JSON.stringify(d, null, 2));
    } catch (e) {
      setResult("❌ Erreur : " + e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {GQL_EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => setQuery(ex.query)} style={{
            background: "#EEF2FF", color: "#4338CA", border: "1px solid #C7D2FE",
            borderRadius: 20, padding: "5px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500
          }}>
            {ex.label}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ background: "#1E1E2E", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#CDD6F4", fontSize: 13, fontWeight: 600 }}>🔮 Requête GraphQL</span>
            <Btn onClick={runQuery} disabled={loading} color="#7C3AED">
              {loading ? "..." : "▶ Exécuter"}
            </Btn>
          </div>
          <textarea
            value={query} onChange={e => setQuery(e.target.value)}
            style={{
              width: "100%", minHeight: 240, background: "#1E1E2E", color: "#A6E3A1",
              border: "none", padding: "16px", fontSize: 13, fontFamily: "monospace",
              resize: "vertical", outline: "none", boxSizing: "border-box"
            }}
          />
        </Card>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ background: "#1E1E2E", padding: "12px 16px" }}>
            <span style={{ color: "#CDD6F4", fontSize: 13, fontWeight: 600 }}>📤 Résultat</span>
          </div>
          <pre style={{
            margin: 0, padding: "16px", background: "#1E1E2E", color: "#89DCEB",
            fontSize: 12, fontFamily: "monospace", minHeight: 240, overflow: "auto"
          }}>
            {result || "← Exécutez une requête pour voir le résultat"}
          </pre>
        </Card>
      </div>
      <Card style={{ marginTop: 16, background: "#F0FDF4" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
          <strong>💡 Accès direct :</strong> Ouvrez <code>http://localhost:3000/graphql</code> dans votre navigateur pour l'interface Apollo Playground complète.
        </p>
      </Card>
    </div>
  );
}

// ─── ARCHITECTURE TAB ─────────────────────────────────────────────────────────
function ArchTab() {
  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>🗺️ Schéma d'architecture</h3>
        <div style={{ overflowX: "auto" }}>
          <svg viewBox="0 0 720 380" style={{ width: "100%", maxWidth: 720 }}>
            {/* Client */}
            <rect x="270" y="10" width="180" height="50" rx="10" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5"/>
            <text x="360" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1D4ED8">Client</text>
            <text x="360" y="50" textAnchor="middle" fontSize="11" fill="#3B82F6">Mobile / Web</text>

            {/* Arrow client -> gateway */}
            <line x1="360" y1="60" x2="360" y2="95" stroke="#6B7280" strokeWidth="1.5" markerEnd="url(#arr)"/>
            <text x="375" y="82" fontSize="10" fill="#6B7280">REST + GraphQL</text>

            {/* Gateway */}
            <rect x="210" y="95" width="300" height="60" rx="10" fill="#F5F3FF" stroke="#7C3AED" strokeWidth="2"/>
            <text x="360" y="121" textAnchor="middle" fontSize="14" fontWeight="700" fill="#5B21B6">API Gateway</text>
            <text x="360" y="143" textAnchor="middle" fontSize="11" fill="#7C3AED">Express + Apollo · port 3000</text>

            {/* gRPC arrows */}
            <line x1="270" y1="155" x2="140" y2="200" stroke="#2563EB" strokeWidth="1.5" strokeDasharray="0" markerEnd="url(#arr2)"/>
            <line x1="360" y1="155" x2="360" y2="200" stroke="#2563EB" strokeWidth="1.5" markerEnd="url(#arr2)"/>
            <line x1="450" y1="155" x2="580" y2="200" stroke="#2563EB" strokeWidth="1.5" markerEnd="url(#arr2)"/>

            {/* gRPC labels */}
            <text x="190" y="185" fontSize="10" fill="#2563EB">gRPC</text>
            <text x="340" y="185" fontSize="10" fill="#2563EB">gRPC</text>
            <text x="490" y="185" fontSize="10" fill="#2563EB">gRPC</text>

            {/* Order Service */}
            <rect x="50" y="200" width="170" height="65" rx="10" fill="#FFF7ED" stroke="#EA580C" strokeWidth="1.5"/>
            <text x="135" y="222" textAnchor="middle" fontSize="12" fontWeight="600" fill="#C2410C">Order Service</text>
            <text x="135" y="238" textAnchor="middle" fontSize="10" fill="#EA580C">👩‍💻 Mayssa · port 50051</text>
            <text x="135" y="254" textAnchor="middle" fontSize="10" fill="#EA580C">SQLite DB</text>

            {/* Delivery Service */}
            <rect x="270" y="200" width="180" height="65" rx="10" fill="#F0FDF4" stroke="#16A34A" strokeWidth="1.5"/>
            <text x="360" y="222" textAnchor="middle" fontSize="12" fontWeight="600" fill="#15803D">Delivery Service</text>
            <text x="360" y="238" textAnchor="middle" fontSize="10" fill="#16A34A">👩‍💻 Nour · port 50052</text>
            <text x="360" y="254" textAnchor="middle" fontSize="10" fill="#16A34A">Kafka Consumer</text>

            {/* Tracking Service */}
            <rect x="500" y="200" width="170" height="65" rx="10" fill="#FDF4FF" stroke="#9333EA" strokeWidth="1.5"/>
            <text x="585" y="222" textAnchor="middle" fontSize="12" fontWeight="600" fill="#7E22CE">Tracking Service</text>
            <text x="585" y="238" textAnchor="middle" fontSize="10" fill="#9333EA">port 50053</text>
            <text x="585" y="254" textAnchor="middle" fontSize="10" fill="#9333EA">In-memory</text>

            {/* Kafka */}
            <rect x="220" y="305" width="280" height="55" rx="10" fill="#FFFBEB" stroke="#D97706" strokeWidth="2"/>
            <text x="360" y="328" textAnchor="middle" fontSize="13" fontWeight="700" fill="#92400E">Apache Kafka</text>
            <text x="360" y="347" textAnchor="middle" fontSize="11" fill="#D97706">topic: order-topic · broker: 9092</text>

            {/* Kafka arrows */}
            <line x1="135" y1="265" x2="250" y2="305" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr3)"/>
            <text x="155" y="298" fontSize="10" fill="#D97706">produce</text>
            <line x1="360" y1="305" x2="360" y2="265" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arr3)"/>
            <text x="365" y="290" fontSize="10" fill="#D97706">consume</text>

            {/* Arrowhead defs */}
            <defs>
              <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#6B7280"/>
              </marker>
              <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#2563EB"/>
              </marker>
              <marker id="arr3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#D97706"/>
              </marker>
            </defs>
          </svg>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Card style={{ borderLeft: "4px solid #EA580C" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#C2410C" }}>📁 order.proto</h4>
          <code style={{ fontSize: 11, color: "#374151", lineHeight: 1.8 }}>
            CreateOrder<br/>GetOrder<br/>GetOrders<br/>UpdateOrder<br/>DeleteOrder
          </code>
        </Card>
        <Card style={{ borderLeft: "4px solid #16A34A" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#15803D" }}>📁 delivery.proto</h4>
          <code style={{ fontSize: 11, color: "#374151", lineHeight: 1.8 }}>
            AssignDelivery<br/>GetDelivery<br/>GetDeliveries<br/>UpdateDeliveryStatus
          </code>
        </Card>
        <Card style={{ borderLeft: "4px solid #9333EA" }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#7E22CE" }}>📁 tracking.proto</h4>
          <code style={{ fontSize: 11, color: "#374151", lineHeight: 1.8 }}>
            TrackOrder<br/>GetAllTracks<br/>UpdateLocation
          </code>
        </Card>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("orders");

  const tabContent = {
    orders: <OrdersTab />,
    delivery: <DeliveryTab />,
    tracking: <TrackingTab />,
    graphql: <GraphQLTab />,
    arch: <ArchTab />,
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#F9FAFB", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "16px 32px", display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>
            🚚 Système de Livraison en Temps Réel
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6B7280" }}>
            SOA & Microservices — Mayssa & Nour · gRPC + Kafka + REST + GraphQL
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {[
            { label: "Order", color: "#FFF7ED", border: "#EA580C", text: "#C2410C", port: "50051" },
            { label: "Delivery", color: "#F0FDF4", border: "#16A34A", text: "#15803D", port: "50052" },
            { label: "Tracking", color: "#FDF4FF", border: "#9333EA", text: "#7E22CE", port: "50053" },
          ].map(s => (
            <div key={s.label} style={{
              background: s.color, border: `1px solid ${s.border}`,
              borderRadius: 20, padding: "4px 12px", fontSize: 12
            }}>
              <span style={{ color: s.text, fontWeight: 600 }}>{s.label}</span>
              <span style={{ color: "#9CA3AF", marginLeft: 4 }}>:{s.port}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 32px", display: "flex", gap: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "14px 18px", fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? "#2563EB" : "#6B7280",
            borderBottom: tab === t.id ? "2px solid #2563EB" : "2px solid transparent",
            transition: "all 0.15s"
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px" }}>
        {tabContent[tab]}
      </div>
    </div>
  );
}