import { useState, useEffect, useRef } from "react";

const API = "http://localhost:3000";

const TABS = [
  { id: "orders",   label: "Commandes",    icon: "📦" },
  { id: "delivery", label: "Livraisons",   icon: "🚚" },
  { id: "tracking", label: "Suivi",        icon: "📍" },
  { id: "graphql",  label: "GraphQL",      icon: "🔮" },
  { id: "arch",     label: "Architecture", icon: "🗺️" },
];

const STATUS_COLORS = {
  pending:          { bg: "#FFF3CD", text: "#856404", border: "#FFE083", label: "En attente" },
  assigned:         { bg: "#D1ECF1", text: "#0C5460", border: "#89D6E0", label: "Assigné" },
  shipped:          { bg: "#D4EDDA", text: "#155724", border: "#8FD5A0", label: "Expédié" },
  delivered:        { bg: "#E8D5F5", text: "#5A1A8C", border: "#C59EE8", label: "Livré" },
  ready_for_pickup: { bg: "#D0F4F1", text: "#005B52", border: "#7FD8CF", label: "Prêt" },
  "en cours":       { bg: "#FFE8D6", text: "#7B2D00", border: "#FFB380", label: "En cours" },
};

// ─── WAVE SEPARATOR ─────────────────────────────────────────────────────────
function WaveSeparator() {
  return (
    <svg viewBox="0 0 100 500" preserveAspectRatio="none"
      style={{ height: "100%", width: "80px", display: "block" }}>
      <path d="M100,0 C60,120 40,180 70,300 C90,380 40,460 100,500 Z" fill="#0f172a" />
      <path d="M100,0 C40,90 20,170 50,290 C70,370 20,450 100,500 Z" fill="#1e293b" opacity="0.6" />
      <path d="M100,0 C20,70 0,150 30,280 C50,360 0,440 100,500 Z" fill="#334155" opacity="0.3" />
    </svg>
  );
}

// ─── AUTH FORM ───────────────────────────────────────────────────────────────
function AuthForm({ onLoginSuccess }) {
  const [isLogin,  setIsLogin]  = useState(true);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [msg,      setMsg]      = useState("");
  const [loading,  setLoading]  = useState(false);

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
      const ct = r.headers.get("content-type");
      if (!ct || !ct.includes("application/json"))
        throw new Error("Le serveur ne répond pas correctement");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Une erreur est survenue");
      if (isLogin) {
        setMsg("✅ Connexion réussie !");
        setTimeout(() => onLoginSuccess(data.user || { email }), 900);
      } else {
        setMsg("✅ Inscription réussie ! Connectez-vous.");
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
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "85vh", padding: "20px",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)"
    }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            borderRadius: "50%",
            background: `rgba(99, 179, 237, ${Math.random() * 0.4 + 0.1})`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }} />
        ))}
      </div>

      <div style={{
        display: "flex", width: "100%", maxWidth: "900px", minHeight: "520px",
        borderRadius: "24px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        overflow: "hidden", position: "relative"
      }}>
        {/* Left Panel */}
        <div style={{
          flex: "1",
          background: "linear-gradient(160deg, #1e3a5f 0%, #0f2744 60%, #0a1628 100%)",
          color: "#e2e8f0",
          padding: "48px 40px",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", textAlign: "center",
          position: "relative", overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", width: "300px", height: "300px",
            borderRadius: "50%", border: "1px solid rgba(99,179,237,0.12)",
            top: "50%", left: "50%", transform: "translate(-50%,-50%)"
          }} />
          <div style={{
            position: "absolute", width: "200px", height: "200px",
            borderRadius: "50%", border: "1px solid rgba(99,179,237,0.18)",
            top: "50%", left: "50%", transform: "translate(-50%,-50%)"
          }} />
          <p style={{ fontSize: "11px", letterSpacing: "3px", marginBottom: "24px", opacity: 0.5, fontWeight: "600", textTransform: "uppercase" }}>
            BIENVENUE SUR
          </p>
          <div style={{
            width: "80px", height: "80px",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            borderRadius: "20px",
            display: "flex", justifyContent: "center", alignItems: "center",
            marginBottom: "20px",
            boxShadow: "0 8px 24px rgba(59,130,246,0.4)"
          }}>
            <span style={{ fontSize: "38px" }}>🚀</span>
          </div>
          <h1 style={{ fontSize: "40px", fontWeight: "800", margin: "0 0 12px", letterSpacing: "-1px", color: "#f1f5f9" }}>
            Spacer
          </h1>
          <p style={{ fontSize: "13px", lineHeight: "1.7", maxWidth: "260px", opacity: 0.6, margin: 0 }}>
            Système de gestion et de suivi de livraison en temps réel — SOA Microservices
          </p>
          <div style={{ marginTop: "32px", display: "flex", gap: "8px" }}>
            {["gRPC", "Kafka", "GraphQL", "REST"].map(t => (
              <span key={t} style={{
                fontSize: "10px", fontWeight: "700", letterSpacing: "1px",
                padding: "4px 10px", borderRadius: "20px",
                background: "rgba(59,130,246,0.15)", color: "#93c5fd",
                border: "1px solid rgba(59,130,246,0.25)"
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div style={{ position: "absolute", left: "calc(50% - 40px)", top: 0, height: "100%", zIndex: 4, pointerEvents: "none" }}>
          <WaveSeparator />
        </div>

        {/* Right Panel — Form */}
        <div style={{
          flex: "1",
          background: "#0f172a",
          padding: "48px 52px 48px 72px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          zIndex: 3
        }}>
          <h2 style={{ fontSize: "26px", color: "#f1f5f9", fontWeight: "700", marginBottom: "8px", letterSpacing: "-0.5px" }}>
            {isLogin ? "Se connecter" : "Créer un compte"}
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 28px" }}>
            {isLogin ? "Accédez à votre tableau de bord" : "Rejoignez la plateforme Spacer"}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", display: "block", marginBottom: "6px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Nom</label>
                <input type="text" placeholder="Votre nom" value={name}
                  onChange={e => setName(e.target.value)} required
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: "10px",
                    border: "1px solid #1e293b", background: "#1e293b",
                    color: "#f1f5f9", fontSize: "14px", outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "#3b82f6"}
                  onBlur={e => e.target.style.borderColor = "#1e293b"}
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", display: "block", marginBottom: "6px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Email</label>
              <input type="email" placeholder="vous@exemple.com" value={email}
                onChange={e => setEmail(e.target.value)} required
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: "10px",
                  border: "1px solid #1e293b", background: "#1e293b",
                  color: "#f1f5f9", fontSize: "14px", outline: "none", boxSizing: "border-box"
                }}
                onFocus={e => e.target.style.borderColor = "#3b82f6"}
                onBlur={e => e.target.style.borderColor = "#1e293b"}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", display: "block", marginBottom: "6px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Mot de passe</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: "10px",
                  border: "1px solid #1e293b", background: "#1e293b",
                  color: "#f1f5f9", fontSize: "14px", outline: "none", boxSizing: "border-box"
                }}
                onFocus={e => e.target.style.borderColor = "#3b82f6"}
                onBlur={e => e.target.style.borderColor = "#1e293b"}
              />
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button type="submit" disabled={loading}
                style={{
                  flex: 1, padding: "13px", borderRadius: "10px",
                  fontSize: "14px", fontWeight: "700", border: "none", cursor: "pointer",
                  background: loading ? "#1d4ed8" : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#fff", letterSpacing: "0.3px",
                  boxShadow: "0 4px 16px rgba(59,130,246,0.3)"
                }}>
                {loading ? "⏳ En cours..." : isLogin ? "Connexion" : "S'inscrire"}
              </button>
              <button type="button" onClick={() => { setIsLogin(!isLogin); setMsg(""); }}
                style={{
                  flex: 1, padding: "13px", borderRadius: "10px",
                  fontSize: "14px", fontWeight: "600", cursor: "pointer",
                  background: "transparent", color: "#64748b",
                  border: "1px solid #1e293b"
                }}>
                {isLogin ? "S'inscrire" : "Connexion"}
              </button>
            </div>
          </form>

          {msg && (
            <div style={{
              marginTop: "18px", fontSize: "13px", textAlign: "center",
              fontWeight: "600", padding: "10px 14px", borderRadius: "8px",
              background: msg.startsWith("✅") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: msg.startsWith("✅") ? "#4ade80" : "#f87171",
              border: `1px solid ${msg.startsWith("✅") ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`
            }}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#1e293b", text: "#94a3b8", border: "#334155", label: status };
  return (
    <span style={{
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      padding: "3px 10px", borderRadius: "20px", fontSize: "11px",
      fontWeight: "700", whiteSpace: "nowrap", letterSpacing: "0.3px"
    }}>
      {s.label || status}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#111827", borderRadius: "14px",
      border: "1px solid #1f2937",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      padding: "22px 26px", ...style
    }}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required
        style={{
          width: "100%", padding: "10px 13px", borderRadius: "9px",
          border: "1px solid #1f2937", background: "#0f172a",
          color: "#f1f5f9", fontSize: "14px", outline: "none",
          boxSizing: "border-box", transition: "border-color 0.2s"
        }}
        onFocus={e => e.target.style.borderColor = "#3b82f6"}
        onBlur={e => e.target.style.borderColor = "#1f2937"}
      />
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <h3 style={{ margin: 0, fontSize: "15px", color: "#f1f5f9", fontWeight: "700" }}>{children}</h3>
      {sub && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#475569" }}>{sub}</p>}
    </div>
  );
}

function Table({ headers, rows, emptyMsg = "Aucune donnée." }) {
  return rows.length === 0
    ? <p style={{ color: "#475569", fontSize: "14px", margin: "20px 0 0" }}>{emptyMsg}</p>
    : (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1f2937" }}>
              {headers.map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: "600", color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
}

function Tr({ children }) {
  return (
    <tr style={{ borderBottom: "1px solid #0f172a" }}
      onMouseEnter={e => e.currentTarget.style.background = "#1a2744"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {children}
    </tr>
  );
}

function Td({ children, accent }) {
  return <td style={{ padding: "11px 14px", color: accent || "#cbd5e1" }}>{children}</td>;
}

function RefreshBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      marginTop: "16px", background: "transparent", border: "1px solid #1f2937",
      borderRadius: "8px", padding: "7px 14px", color: "#64748b", fontSize: "13px", cursor: "pointer",
    }}
      onMouseEnter={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.color = "#93c5fd"; }}
      onMouseLeave={e => { e.target.style.borderColor = "#1f2937"; e.target.style.color = "#64748b"; }}
    >
      🔄 Actualiser
    </button>
  );
}

function PrimaryBtn({ children, onClick, disabled, color = "#3b82f6", colorEnd = "#1d4ed8" }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "11px 18px",
      background: disabled ? "#1f2937" : `linear-gradient(135deg, ${color}, ${colorEnd})`,
      color: disabled ? "#475569" : "#fff",
      border: "none", borderRadius: "9px",
      fontSize: "14px", fontWeight: "700", cursor: disabled ? "default" : "pointer",
      boxShadow: disabled ? "none" : `0 4px 16px ${color}40`,
    }}>
      {children}
    </button>
  );
}

function Msg({ text }) {
  if (!text) return null;
  const ok = text.startsWith("✅");
  return (
    <div style={{
      marginTop: "12px", fontSize: "13px", fontWeight: "600",
      padding: "9px 13px", borderRadius: "8px",
      background: ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      color: ok ? "#4ade80" : "#f87171",
      border: `1px solid ${ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`
    }}>
      {text}
    </div>
  );
}

// ─── ORDERS TAB ──────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders,         setOrders]         = useState([]);
  const [product,        setProduct]        = useState("");
  const [quantity,       setQuantity]       = useState("");
  const [status,         setStatus]         = useState("pending");
  const [loading,        setLoading]        = useState(false);
  const [msg,            setMsg]            = useState("");
  const [isEditing,      setIsEditing]      = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const fetchOrders = () =>
    fetch(`${API}/orders`)
      .then(r => r.json())
      .then(raw => {
        const list = Array.isArray(raw) ? raw : (raw.orders || raw.data || raw.result || []);
        setOrders(list);
      })
      .catch(() => {});

  useEffect(() => { fetchOrders(); }, []);

  const handleOrderSubmit = async () => {
    setLoading(true); setMsg("");
    try {
      if (isEditing) {
        const r = await fetch(`${API}/orders/${editingOrderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        if (!r.ok) throw new Error();
        setMsg(`✅ Statut commande #${editingOrderId} mis à jour !`);
        setIsEditing(false); setEditingOrderId(null);
      } else {
        if (!product || !quantity) return;
        const r = await fetch(`${API}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, quantity: parseInt(quantity) })
        });
        const raw = await r.json();
        const data = raw.order || raw.data || raw.result || raw;
        const orderId = data.id || data.order_id || "créée";
        setMsg(`✅ Commande #${orderId} créée — Kafka notifie le service !`);
      }
      setProduct(""); setQuantity(""); setStatus("pending");
      fetchOrders();
    } catch {
      setMsg("❌ Erreur de communication avec le serveur");
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>
      <Card>
        <SectionTitle sub="Order Service · port 50051">
          {isEditing ? `✏️ Modifier statut #${editingOrderId}` : "📦 Nouvelle commande"}
        </SectionTitle>
        {!isEditing ? (
          <>
            <Input label="Produit"  value={product}  onChange={setProduct}  placeholder="Ex: Laptop" />
            <Input label="Quantité" value={quantity} onChange={setQuantity} placeholder="Ex: 2" type="number" />
          </>
        ) : (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Nouveau statut
            </label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ width: "100%", padding: "10px 13px", borderRadius: "9px", border: "1px solid #1f2937", background: "#0f172a", color: "#f1f5f9", fontSize: "14px", outline: "none" }}>
              <option value="pending">En attente</option>
              <option value="assigned">Assigné</option>
              <option value="shipped">Expédié</option>
              <option value="delivered">Livré</option>
            </select>
          </div>
        )}
        <PrimaryBtn
          onClick={handleOrderSubmit}
          disabled={loading || (!isEditing && (!product || !quantity))}
          color={isEditing ? "#f59e0b" : "#3b82f6"}
          colorEnd={isEditing ? "#d97706" : "#1d4ed8"}
        >
          {loading ? "Envoi..." : isEditing ? "Mettre à jour" : "Créer la commande"}
        </PrimaryBtn>
        {isEditing && (
          <button onClick={() => { setIsEditing(false); setEditingOrderId(null); }}
            style={{ width: "100%", marginTop: "8px", padding: "9px", borderRadius: "9px", background: "transparent", color: "#64748b", border: "1px solid #1f2937", fontSize: "13px", cursor: "pointer" }}>
            Annuler
          </button>
        )}
        <Msg text={msg} />
      </Card>

      <Card>
        <SectionTitle>📋 Toutes les commandes</SectionTitle>
        <Table
          headers={["ID", "Produit", "Quantité", "Statut", "Action"]}
          emptyMsg="Aucune commande enregistrée."
          rows={orders.map(o => (
            <Tr key={o.id}>
              <Td accent="#60a5fa">#{o.id}</Td>
              <Td>{o.product}</Td>
              <Td>{o.quantity}</Td>
              <Td><Badge status={o.status} /></Td>
              <Td>
                <button onClick={() => { setIsEditing(true); setEditingOrderId(o.id); setStatus(o.status); setMsg(""); }}
                  style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", fontWeight: "600" }}>
                  ✏️ Statut
                </button>
              </Td>
            </Tr>
          ))}
        />
        <RefreshBtn onClick={fetchOrders} />
      </Card>
    </div>
  );
}

// ─── DELIVERY TAB ────────────────────────────────────────────────────────────
function DeliveryTab() {
  const [deliveries,       setDeliveries]       = useState([]);
  const [orders,           setOrders]           = useState([]);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [selectedOrderId,  setSelectedOrderId]  = useState("");
  const [address,          setAddress]          = useState("");
  const [msg,              setMsg]              = useState("");
  const [loadingData,      setLoadingData]      = useState(true);

  const fetchAll = async () => {
    setLoadingData(true);
    try {
      const [ordersRes, deliveriesRes] = await Promise.all([
        fetch(`${API}/orders`).then(r => r.json()),
        fetch(`${API}/delivery`).then(r => r.json()),
      ]);
      const allOrders     = Array.isArray(ordersRes)     ? ordersRes     : [];
      const allDeliveries = Array.isArray(deliveriesRes) ? deliveriesRes : [];
      const assignedOrderIds = new Set(allDeliveries.map(d => String(d.order_id)));
      const available = allOrders.filter(o => !assignedOrderIds.has(String(o.id)));
      setOrders(allOrders);
      setDeliveries(allDeliveries);
      setUnassignedOrders(available);
      if (selectedOrderId && assignedOrderIds.has(String(selectedOrderId)))
        setSelectedOrderId("");
    } catch (err) {
      console.error("Erreur chargement données:", err);
    }
    setLoadingData(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const assignDelivery = async () => {
    if (!selectedOrderId || !address.trim()) return;
    try {
      const r = await fetch(`${API}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: parseInt(selectedOrderId), address })
      });
      const d = await r.json();
      setMsg(`✅ Livraison ${d.id} assignée à la commande #${selectedOrderId}`);
      setSelectedOrderId(""); setAddress("");
      fetchAll();
    } catch {
      setMsg("❌ Erreur lors de l'assignation");
    }
  };

  const getOrderLabel = (o) =>
    `#${o.id} — ${o.product} (qté: ${o.quantity}) · ${STATUS_COLORS[o.status]?.label || o.status}`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px" }}>
      <Card>
        <SectionTitle sub="Delivery Service · port 50052">🚚 Assigner une livraison</SectionTitle>
        <div style={{ marginBottom: "14px" }}>
          <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Commande sans livraison
          </label>
          {loadingData ? (
            <div style={{ padding: "10px 13px", borderRadius: "9px", background: "#0f172a", border: "1px solid #1f2937", color: "#475569", fontSize: "14px" }}>⏳ Chargement...</div>
          ) : unassignedOrders.length === 0 ? (
            <div style={{ padding: "10px 13px", borderRadius: "9px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "13px", fontWeight: "600" }}>
              ✅ Toutes les commandes ont déjà une livraison.
            </div>
          ) : (
            <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}
              style={{ width: "100%", padding: "10px 13px", borderRadius: "9px", border: "1px solid #1f2937", background: "#0f172a", color: selectedOrderId ? "#f1f5f9" : "#475569", fontSize: "13px", outline: "none", cursor: "pointer" }}
              onFocus={e => e.target.style.borderColor = "#10b981"}
              onBlur={e => e.target.style.borderColor = "#1f2937"}
            >
              <option value="">— Sélectionner une commande —</option>
              {unassignedOrders.map(o => <option key={o.id} value={o.id}>{getOrderLabel(o)}</option>)}
            </select>
          )}
          {!loadingData && (
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>
              {unassignedOrders.length} commande(s) en attente de livraison sur {orders.length} au total
            </p>
          )}
        </div>
        <Input label="Adresse de livraison" value={address} onChange={setAddress} placeholder="Ex: 12 rue de Paris, Tunis" />
        <PrimaryBtn onClick={assignDelivery} disabled={!selectedOrderId || !address.trim()} color="#059669" colorEnd="#047857">
          Assigner la livraison
        </PrimaryBtn>
        <button onClick={fetchAll} style={{ width: "100%", marginTop: "8px", padding: "8px", borderRadius: "9px", background: "transparent", color: "#475569", border: "1px solid #1f2937", fontSize: "12px", cursor: "pointer" }}>
          🔄 Rafraîchir les commandes
        </button>
        <Msg text={msg} />
      </Card>

      <Card>
        <SectionTitle>📋 Toutes les livraisons</SectionTitle>
        <Table
          headers={["ID Livraison", "Commande", "Produit", "Adresse", "Statut"]}
          emptyMsg="Aucune livraison enregistrée."
          rows={deliveries.map(d => {
            const order = orders.find(o => String(o.id) === String(d.order_id));
            return (
              <Tr key={d.id}>
                <Td accent="#34d399">{d.id}</Td>
                <Td accent="#60a5fa">#{d.order_id}</Td>
                <Td>{order ? order.product : "—"}</Td>
                <Td>{d.address}</Td>
                <Td><Badge status={d.status} /></Td>
              </Tr>
            );
          })}
        />
        <RefreshBtn onClick={fetchAll} />
      </Card>
    </div>
  );
}

// ─── TRACKING TAB ────────────────────────────────────────────────────────────
function TrackingTab() {
  const [tracks,          setTracks]          = useState([]);
  const [orders,          setOrders]          = useState([]);
  const [untrackedOrders, setUntrackedOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [location,        setLocation]        = useState("");
  const [newStatus,       setNewStatus]       = useState("en cours");
  const [msg,             setMsg]             = useState("");
  const [msgUpdate,       setMsgUpdate]       = useState("");
  const [loadingData,     setLoadingData]     = useState(true);

  const fetchAll = async () => {
    setLoadingData(true);
    try {
      const [ordersRes, tracksRes] = await Promise.all([
        fetch(`${API}/orders`).then(r => r.json()),
        fetch(`${API}/track`).then(r => r.json()),
      ]);
      const allOrders = Array.isArray(ordersRes) ? ordersRes : (ordersRes.orders || ordersRes.data || []);
      const rawTracks = Array.isArray(tracksRes) ? tracksRes : (tracksRes.tracks || tracksRes.result || tracksRes.data || []);
      const allTracks = rawTracks.map(t => ({
        ...t,
        location: t.location || t.localisation || "Entrepôt central",
        status:   t.status   || "en cours",
      }));
      const trackedOrderIds = new Set(allTracks.map(t => String(t.order_id)));
      const available = allOrders.filter(o => !trackedOrderIds.has(String(o.id)));
      setOrders(allOrders);
      setTracks(allTracks);
      setUntrackedOrders(available);
      if (selectedOrderId && trackedOrderIds.has(String(selectedOrderId)))
        setSelectedOrderId("");
    } catch (err) {
      console.error("Erreur chargement:", err);
    }
    setLoadingData(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSelectTrack = (trackId) => {
    setSelectedTrackId(trackId);
    const found = tracks.find(t => t.id === trackId);
    if (found) { setLocation(found.location || ""); setNewStatus(found.status || "en cours"); }
    else { setLocation(""); setNewStatus("en cours"); }
  };

  const trackOrder = async () => {
    if (!selectedOrderId) return;
    try {
      const r = await fetch(`${API}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: parseInt(selectedOrderId) })
      });
      const raw = await r.json();
      const d = raw.track || raw.result || raw.data || raw;
      const trackId  = d.id || d.trackId || d.track_id || "créé";
      const position = d.location || d.localisation || "Entrepôt central";
      setMsg(`✅ Suivi ${trackId} créé — Position : ${position}`);
      setSelectedOrderId("");
      fetchAll();
    } catch { setMsg("❌ Erreur lors de la création du suivi"); }
  };

  const updateLocation = async () => {
    if (!selectedTrackId || !location.trim()) return;
    try {
      const r = await fetch(`${API}/track/${selectedTrackId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, status: newStatus })
      });
      if (!r.ok) throw new Error();
      setMsgUpdate(`✅ Position de ${selectedTrackId} → "${location}" (${newStatus})`);
      setSelectedTrackId(""); setLocation("");
      fetchAll();
    } catch { setMsgUpdate("❌ Erreur lors de la mise à jour"); }
  };

  const orderLabel = (o) => `#${o.id} — ${o.product} (qté: ${o.quantity})`;
  const trackLabel = (t) => {
    const order = orders.find(o => String(o.id) === String(t.order_id));
    return `${t.id} · ${order ? order.product : `Commande #${t.order_id}`} · ${t.location} · ${t.status}`;
  };

  const selectStyle = {
    width: "100%", padding: "10px 13px", borderRadius: "9px",
    border: "1px solid #1f2937", background: "#0f172a",
    color: "#f1f5f9", fontSize: "13px", outline: "none", cursor: "pointer"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <Card>
          <SectionTitle sub="Tracking Service · port 50053">📍 Créer un suivi</SectionTitle>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Commande sans suivi
            </label>
            {loadingData ? (
              <div style={{ ...selectStyle, color: "#475569" }}>⏳ Chargement...</div>
            ) : untrackedOrders.length === 0 ? (
              <div style={{ padding: "10px 13px", borderRadius: "9px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80", fontSize: "13px", fontWeight: "600" }}>
                ✅ Toutes les commandes ont déjà un suivi.
              </div>
            ) : (
              <select value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}
                style={{ ...selectStyle, color: selectedOrderId ? "#f1f5f9" : "#475569" }}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "#1f2937"}
              >
                <option value="">— Sélectionner une commande —</option>
                {untrackedOrders.map(o => <option key={o.id} value={o.id}>{orderLabel(o)}</option>)}
              </select>
            )}
            {!loadingData && (
              <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#475569" }}>
                {untrackedOrders.length} commande(s) sans suivi sur {orders.length} au total
              </p>
            )}
          </div>
          <PrimaryBtn onClick={trackOrder} disabled={!selectedOrderId} color="#7c3aed" colorEnd="#5b21b6">
            Créer le suivi
          </PrimaryBtn>
          <button onClick={fetchAll} style={{ width: "100%", marginTop: "8px", padding: "8px", borderRadius: "9px", background: "transparent", color: "#475569", border: "1px solid #1f2937", fontSize: "12px", cursor: "pointer" }}>
            🔄 Rafraîchir
          </button>
          <Msg text={msg} />
        </Card>

        <Card>
          <SectionTitle sub="Mise à jour position colis">✏️ Modifier la position</SectionTitle>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Sélectionner un suivi
            </label>
            {tracks.length === 0 ? (
              <div style={{ padding: "10px 13px", borderRadius: "9px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "13px", fontWeight: "600" }}>
                ⚠️ Aucun suivi disponible. Créez-en un d'abord.
              </div>
            ) : (
              <select value={selectedTrackId} onChange={e => handleSelectTrack(e.target.value)}
                style={{ ...selectStyle, color: selectedTrackId ? "#f1f5f9" : "#475569" }}
                onFocus={e => e.target.style.borderColor = "#0891b2"}
                onBlur={e => e.target.style.borderColor = "#1f2937"}
              >
                <option value="">— Sélectionner un suivi —</option>
                {tracks.map(t => <option key={t.id} value={t.id}>{trackLabel(t)}</option>)}
              </select>
            )}
          </div>
          <Input label="Nouvelle localisation" value={location} onChange={setLocation} placeholder="Ex: Tunis, Sfax, Chez client..." />
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Statut</label>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
              style={selectStyle}
              onFocus={e => e.target.style.borderColor = "#0891b2"}
              onBlur={e => e.target.style.borderColor = "#1f2937"}
            >
              <option value="en cours">🔄 En cours</option>
              <option value="en livraison">🚚 En livraison</option>
              <option value="livré">✅ Livré</option>
            </select>
          </div>
          <PrimaryBtn onClick={updateLocation} disabled={!selectedTrackId || !location.trim()} color="#0891b2" colorEnd="#0e7490">
            Mettre à jour
          </PrimaryBtn>
          <Msg text={msgUpdate} />
        </Card>
      </div>

      <Card>
        <SectionTitle>📋 Tous les suivis</SectionTitle>
        <Table
          headers={["ID Suivi", "Commande", "Produit", "Localisation", "Statut"]}
          emptyMsg="Aucun suivi enregistré."
          rows={tracks.map(t => {
            const order = orders.find(o => String(o.id) === String(t.order_id));
            return (
              <Tr key={t.id}>
                <Td accent="#a78bfa">{t.id}</Td>
                <Td accent="#60a5fa">#{t.order_id}</Td>
                <Td>{order ? order.product : "—"}</Td>
                <Td>{t.location || "N/A"}</Td>
                <Td><Badge status={t.status} /></Td>
              </Tr>
            );
          })}
        />
        <RefreshBtn onClick={fetchAll} />
      </Card>
    </div>
  );
}

// ─── GRAPHQL TAB ─────────────────────────────────────────────────────────────
// ✅ CORRECTION ICI — getAllTracks au lieu de getTracks (qui n'existe pas dans le schéma)
const GQL_EXAMPLES = [
  {
    label: "getOrders",
    query: `query {\n  getOrders {\n    id\n    product\n    quantity\n    status\n  }\n}`
  },
  {
    label: "getDeliveries",
    query: `query {\n  getDeliveries {\n    id\n    order_id\n    address\n    status\n  }\n}`
  },
  {
    // ✅ CORRIGÉ : était "getTracks" → maintenant "getAllTracks" (nom exact du schéma GraphQL)
    label: "getAllTracks",
    query: `query {\n  getAllTracks {\n    id\n    order_id\n    location\n    status\n  }\n}`
  },
  {
    // ✅ BONUS — exemple mutation createOrder pour la démo
    label: "createOrder (mutation)",
    query: `mutation {\n  createOrder(\n    product: "Laptop"\n    quantity: 2\n  ) {\n    id\n    product\n    quantity\n    status\n  }\n}`
  },
  {
    // ✅ BONUS — exemple getOrder par ID
    label: "getOrder(id)",
    query: `query {\n  getOrder(id: 1) {\n    id\n    product\n    quantity\n    status\n  }\n}`
  },
];

function GraphQLTab() {
  const [query,   setQuery]   = useState(GQL_EXAMPLES[0].query);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      {/* Boutons exemples */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {GQL_EXAMPLES.map(ex => (
          <button key={ex.label} onClick={() => setQuery(ex.query)}
            style={{
              background: query === ex.query ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.07)",
              color: query === ex.query ? "#a78bfa" : "#7c3aed",
              border: `1px solid ${query === ex.query ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.15)"}`,
              borderRadius: "20px", padding: "6px 14px",
              cursor: "pointer", fontSize: "13px", fontWeight: "600"
            }}>
            {ex.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Editor */}
        <div style={{ borderRadius: "14px", border: "1px solid #1f2937", overflow: "hidden" }}>
          <div style={{
            background: "#0a0f1a", padding: "12px 16px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid #1f2937"
          }}>
            <span style={{ color: "#7c3aed", fontWeight: "700", fontSize: "13px" }}>🔮 Requête GraphQL</span>
            <button onClick={runQuery}
              style={{
                background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                color: "#fff", border: "none", borderRadius: "8px",
                padding: "6px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "700",
                boxShadow: "0 4px 12px rgba(124,58,237,0.35)"
              }}>
              ▶ Exécuter
            </button>
          </div>
          <textarea value={query} onChange={e => setQuery(e.target.value)}
            style={{
              width: "100%", minHeight: "260px",
              background: "#050a14", color: "#a78bfa",
              border: "none", padding: "18px",
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
              fontSize: "14px", lineHeight: "1.7", resize: "vertical",
              outline: "none", boxSizing: "border-box"
            }} />
        </div>

        {/* Result */}
        <div style={{ borderRadius: "14px", border: "1px solid #1f2937", overflow: "hidden" }}>
          <div style={{ background: "#0a0f1a", padding: "12px 16px", borderBottom: "1px solid #1f2937" }}>
            <span style={{ color: "#22d3ee", fontWeight: "700", fontSize: "13px" }}>📄 Résultat</span>
          </div>
          <pre style={{
            margin: 0, padding: "18px",
            background: "#050a14", color: "#67e8f9",
            minHeight: "260px", overflow: "auto",
            fontFamily: "'Fira Code', 'Cascadia Code', monospace",
            fontSize: "13px", lineHeight: "1.7"
          }}>
            {loading ? "⏳ Exécution en cours..." : result || "← Choisissez une requête et cliquez sur Exécuter"}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── ARCHITECTURE TAB ────────────────────────────────────────────────────────
function ArchTab() {
  const nodes = [
    { x: 280, y: 28,  w: 160, h: 46, label: "API Gateway",      sub: "port 3000 · REST + GraphQL",  color: "#1e3a5f", stroke: "#3b82f6", text: "#93c5fd" },
    { x: 50,  y: 150, w: 140, h: 44, label: "Auth Service",     sub: "JWT · REST",                  color: "#0f2d2a", stroke: "#059669", text: "#6ee7b7" },
    { x: 220, y: 150, w: 150, h: 44, label: "Order Service",    sub: "gRPC · port 50051",           color: "#1a2550", stroke: "#3b82f6", text: "#93c5fd" },
    { x: 400, y: 150, w: 160, h: 44, label: "Delivery Service", sub: "gRPC · port 50052",           color: "#0f2d2a", stroke: "#10b981", text: "#6ee7b7" },
    { x: 590, y: 150, w: 160, h: 44, label: "Tracking Service", sub: "gRPC · port 50053",           color: "#1e1050", stroke: "#8b5cf6", text: "#c4b5fd" },
    { x: 220, y: 300, w: 150, h: 44, label: "SQLite Orders",    sub: "orders.db",                   color: "#1c1408", stroke: "#f59e0b", text: "#fcd34d" },
    { x: 400, y: 300, w: 150, h: 44, label: "SQLite Delivery",  sub: "delivery.db",                 color: "#1c1408", stroke: "#f59e0b", text: "#fcd34d" },
    { x: 590, y: 300, w: 160, h: 44, label: "SQLite Tracking",  sub: "tracking.db",                 color: "#1c1408", stroke: "#f59e0b", text: "#fcd34d" },
    { x: 300, y: 420, w: 160, h: 44, label: "Apache Kafka",     sub: "Event Bus Async",             color: "#1c0808", stroke: "#ef4444", text: "#fca5a5" },
    { x: 590, y: 420, w: 160, h: 44, label: "GraphQL Layer",    sub: "Aggregator",                  color: "#1e1050", stroke: "#8b5cf6", text: "#c4b5fd" },
  ];

  const arrows = [
    { x1: 360, y1: 74, x2: 120, y2: 150, label: "REST" },
    { x1: 360, y1: 74, x2: 295, y2: 150, label: "gRPC" },
    { x1: 360, y1: 74, x2: 480, y2: 150, label: "gRPC" },
    { x1: 360, y1: 74, x2: 670, y2: 150, label: "gRPC" },
    { x1: 295, y1: 194, x2: 295, y2: 300 },
    { x1: 480, y1: 194, x2: 480, y2: 300 },
    { x1: 670, y1: 194, x2: 670, y2: 300 },
    { x1: 295, y1: 194, x2: 380, y2: 420, dashed: true },
    { x1: 480, y1: 194, x2: 430, y2: 420, dashed: true },
    // ✅ AJOUTÉ — flèche Kafka vers Tracking Service (consumer ajouté)
    { x1: 590, y1: 194, x2: 430, y2: 420, dashed: true },
  ];

  return (
    <Card>
      <SectionTitle sub="Services connectés via gRPC · événements asynchrones via Apache Kafka">
        🗺️ Architecture SOA — Microservices
      </SectionTitle>

      <div style={{ display: "flex", gap: "20px", marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { color: "#3b82f6", label: "gRPC / REST" },
          { color: "#ef4444", dashed: true, label: "Kafka (async)" },
          { color: "#f59e0b", label: "SQLite DB" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "2px", background: l.dashed ? "none" : l.color, borderTop: l.dashed ? `2px dashed ${l.color}` : "none" }} />
            <span style={{ fontSize: "12px", color: "#64748b" }}>{l.label}</span>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg viewBox="0 0 820 490" style={{ width: "100%", minWidth: "640px", display: "block" }}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1.5L8 5L2 8.5" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          {arrows.map((a, i) => (
            <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
              stroke={a.dashed ? "#ef4444" : "#3b82f6"}
              strokeWidth="1.5" strokeOpacity="0.5"
              strokeDasharray={a.dashed ? "5 4" : undefined}
              markerEnd="url(#arr)"
            />
          ))}
          <path d="M440 74 Q560 110 590 420" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 3" markerEnd="url(#arr)" />
          {nodes.map((n, i) => (
            <g key={i}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="10" fill={n.color} stroke={n.stroke} strokeWidth="1.5" strokeOpacity="0.5" />
              <text x={n.x + n.w / 2} y={n.y + 17} textAnchor="middle" fontSize="12" fontWeight="700" fill={n.text}>{n.label}</text>
              <text x={n.x + n.w / 2} y={n.y + 32} textAnchor="middle" fontSize="10" fill={n.text} opacity="0.55">{n.sub}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Kafka topics */}
      <div style={{ marginTop: "20px", padding: "16px", background: "rgba(239,68,68,0.07)", borderRadius: "10px", border: "1px solid rgba(239,68,68,0.15)" }}>
        <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: "700", color: "#fca5a5" }}>📡 Topics Kafka</p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            // ✅ CORRIGÉ — Delivery ET Tracking consomment order-topic
            { topic: "order-topic", from: "Order Service", to: "Delivery Service + Tracking Service" },
          ].map(t => (
            <div key={t.topic} style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <span style={{ color: "#f87171", fontWeight: "700" }}>{t.topic}</span>
              <span style={{ color: "#94a3b8", marginLeft: "6px" }}>produit par Order Service → consommé par {t.to}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,  setTab]  = useState("orders");
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("spacer_user");
      if (saved) setUser(JSON.parse(saved));
    } catch { localStorage.removeItem("spacer_user"); }
  }, []);

  const handleLogin  = (u) => { setUser(u); try { localStorage.setItem("spacer_user", JSON.stringify(u)); } catch {} };
  const handleLogout = ()  => { setUser(null); localStorage.removeItem("spacer_user"); };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#0b1120", minHeight: "100vh", color: "#f1f5f9" }}>

      {/* Header */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1f2937", padding: "14px 28px", display: "flex", alignItems: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 4px 12px rgba(59,130,246,0.35)" }}>
            🚀
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "17px", fontWeight: "800", letterSpacing: "-0.5px", color: "#f1f5f9" }}>
              Spacer — Livraison en Temps Réel
            </h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#475569" }}>
              SOA &amp; Microservices · gRPC · Kafka · GraphQL · REST
            </p>
          </div>
        </div>

        {user && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>👤</div>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>{user.email}</span>
            </div>
            <button onClick={handleLogout}
              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "6px 14px", fontSize: "13px", cursor: "pointer", fontWeight: "600" }}>
              Quitter
            </button>
          </div>
        )}
      </div>

      {!user ? (
        <AuthForm onLoginSuccess={handleLogin} />
      ) : (
        <>
          {/* Tabs */}
          <div style={{ background: "#0f172a", borderBottom: "1px solid #1f2937", padding: "0 28px", display: "flex", gap: "2px" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "14px 16px",
                  color: tab === t.id ? "#60a5fa" : "#64748b",
                  borderBottom: `2px solid ${tab === t.id ? "#3b82f6" : "transparent"}`,
                  fontSize: "14px", fontWeight: tab === t.id ? "700" : "400",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={e => { if (tab !== t.id) e.currentTarget.style.color = "#94a3b8"; }}
                onMouseLeave={e => { if (tab !== t.id) e.currentTarget.style.color = "#64748b"; }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: "24px 28px" }}>
            {tab === "orders"   && <OrdersTab />}
            {tab === "delivery" && <DeliveryTab />}
            {tab === "tracking" && <TrackingTab />}
            {tab === "graphql"  && <GraphQLTab />}
            {tab === "arch"     && <ArchTab />}
          </div>
        </>
      )}
    </div>
  );
}