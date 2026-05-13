import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:3000";

const STATUS_MAP = {
  pending: { label: "En attente", bg: "#FFF8E1", color: "#B45309" },
  assigned: { label: "Assigné", bg: "#DBEAFE", color: "#1E40AF" },
  shipped: { label: "Expédié", bg: "#D1FAE5", color: "#065F46" },
  delivered: { label: "Livré", bg: "#F3E8FF", color: "#6B21A8" },
  ready_for_pickup: { label: "Prêt", bg: "#CCFBF1", color: "#0F766E" },
  "en cours": { label: "En cours", bg: "#FFE4E6", color: "#9F1239" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Syne', sans-serif;
    background: #0D0D0F;
    color: #E8E6E0;
    min-height: 100vh;
  }

  :root {
    --mono: 'IBM Plex Mono', monospace;
    --sans: 'Syne', sans-serif;
    --surface: #17171A;
    --surface2: #1E1E23;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.12);
    --text-dim: rgba(232,230,224,0.45);
    --text-mid: rgba(232,230,224,0.7);
    --orange: #FF6B35;
    --green: #3ECFA0;
    --purple: #9B7CF8;
    --amber: #F5A623;
  }

  .app { display: flex; min-height: 100vh; }

  .sidebar {
    width: 240px;
    min-width: 240px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 0;
    position: sticky;
    top: 0;
    height: 100vh;
  }

  .sidebar-logo {
    padding: 28px 24px 20px;
    border-bottom: 1px solid var(--border);
  }

  .logo-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, rgba(255,107,53,0.15), rgba(155,124,248,0.1));
    border: 1px solid rgba(255,107,53,0.25);
    border-radius: 10px;
    padding: 8px 12px;
    margin-bottom: 10px;
  }

  .logo-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--orange);
    box-shadow: 0 0 8px var(--orange);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .logo-text {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--orange);
    font-family: var(--mono);
  }

  .sidebar-title {
    font-size: 18px;
    font-weight: 800;
    color: #E8E6E0;
    line-height: 1.2;
  }

  .sidebar-subtitle {
    font-size: 11px;
    color: var(--text-dim);
    margin-top: 4px;
    font-family: var(--mono);
  }

  .sidebar-nav {
    padding: 16px 12px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .nav-section {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-dim);
    padding: 12px 12px 6px;
    font-family: var(--mono);
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-mid);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    width: 100%;
    text-align: left;
  }

  .nav-btn:hover { background: rgba(255,255,255,0.05); color: #E8E6E0; }

  .nav-btn.active {
    color: #E8E6E0;
    background: rgba(255,255,255,0.07);
  }

  .nav-icon {
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }

  .nav-icon.order { background: rgba(255,107,53,0.15); }
  .nav-icon.delivery { background: rgba(62,207,160,0.15); }
  .nav-icon.tracking { background: rgba(155,124,248,0.15); }
  .nav-icon.graphql { background: rgba(245,166,35,0.15); }
  .nav-icon.arch { background: rgba(232,230,224,0.08); }

  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
  }

  .service-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 11px;
    font-family: var(--mono);
  }

  .service-dot {
    width: 6px; height: 6px; border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .topbar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 16px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .topbar-left { display: flex; flex-direction: column; }

  .page-title {
    font-size: 20px;
    font-weight: 800;
    color: #E8E6E0;
  }

  .page-sub {
    font-size: 12px;
    color: var(--text-dim);
    font-family: var(--mono);
    margin-top: 2px;
  }

  .topbar-actions { display: flex; gap: 10px; align-items: center; }

  .content { padding: 28px 32px; flex: 1; }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 22px 24px;
  }

  .card-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: var(--mono);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-accent {
    width: 4px; height: 16px; border-radius: 2px;
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 20px;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .form-group { margin-bottom: 14px; }

  .form-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: var(--mono);
    margin-bottom: 6px;
  }

  .form-input {
    width: 100%;
    padding: 10px 13px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: #E8E6E0;
    font-family: var(--mono);
    font-size: 13px;
    transition: border-color 0.15s;
    outline: none;
  }

  .form-input:focus { border-color: var(--orange); }
  .form-input::placeholder { color: rgba(232,230,224,0.25); }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 8px;
    border: none;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-orange { background: var(--orange); color: #0D0D0F; }
  .btn-orange:hover:not(:disabled) { background: #FF8A5C; }

  .btn-green { background: var(--green); color: #0D0D0F; }
  .btn-green:hover:not(:disabled) { background: #5BE0B5; }

  .btn-purple { background: var(--purple); color: #0D0D0F; }
  .btn-purple:hover:not(:disabled) { background: #B49AFC; }

  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border2);
    color: var(--text-mid);
  }

  .btn-ghost:hover:not(:disabled) { border-color: rgba(255,255,255,0.25); color: #E8E6E0; }

  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }

  .data-table th {
    text-align: left;
    padding: 10px 14px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: var(--mono);
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }

  .data-table th:first-child { border-radius: 6px 0 0 6px; }
  .data-table th:last-child { border-radius: 0 6px 6px 0; }

  .data-table td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: var(--text-mid);
    vertical-align: middle;
  }

  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: rgba(255,255,255,0.025); }

  .id-cell {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 500;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    font-family: var(--mono);
    letter-spacing: 0.04em;
  }

  .status-msg {
    margin-top: 14px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-family: var(--mono);
  }

  .status-ok { background: rgba(62,207,160,0.1); color: var(--green); border: 1px solid rgba(62,207,160,0.2); }
  .status-err { background: rgba(229,57,53,0.1); color: #EF5350; border: 1px solid rgba(229,57,53,0.2); }

  .kafka-banner {
    background: rgba(245,166,35,0.08);
    border: 1px solid rgba(245,166,35,0.2);
    border-radius: 10px;
    padding: 12px 14px;
    margin-top: 16px;
    font-size: 11px;
    color: var(--amber);
    font-family: var(--mono);
    line-height: 1.6;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    color: var(--text-dim);
    gap: 8px;
    font-size: 13px;
    font-family: var(--mono);
  }

  .empty-icon { font-size: 32px; opacity: 0.3; }

  .gql-chip {
    display: inline-flex;
    align-items: center;
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    font-family: var(--mono);
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid var(--border2);
    color: var(--text-mid);
    background: transparent;
  }

  .gql-chip:hover, .gql-chip.active {
    background: rgba(155,124,248,0.15);
    border-color: rgba(155,124,248,0.35);
    color: var(--purple);
  }

  .gql-editor {
    width: 100%;
    min-height: 220px;
    background: #0D0D0F;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    color: #9B7CF8;
    font-family: var(--mono);
    font-size: 12px;
    resize: vertical;
    outline: none;
    line-height: 1.8;
  }

  .gql-editor:focus { border-color: var(--purple); }

  .gql-result {
    background: #0D0D0F;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
    font-family: var(--mono);
    font-size: 11px;
    color: #3ECFA0;
    min-height: 220px;
    overflow: auto;
    line-height: 1.8;
    white-space: pre;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-family: var(--mono);
  }

  .stat-val {
    font-size: 26px;
    font-weight: 800;
    line-height: 1;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

  .proto-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px;
  }

  .proto-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: var(--mono);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .method-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-mid);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  .method-item:last-child { border-bottom: none; }

  .method-dot {
    width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
  }
`;

// ── Components ──────────────────────────────────────────────────────────────

function Badge({ status }) {
  const s = STATUS_MAP[status] || { label: status, bg: "#2A2A2F", color: "#9CA3AF" };
  return (
    <span className="badge" style={{ background: s.bg + "22", color: s.color }}>
      {s.label || status}
    </span>
  );
}

function FormInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

// ── Orders Tab ──────────────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetch_ = useCallback(() =>
    fetch(`${API}/orders`).then(r => r.json()).then(setOrders).catch(() => {}), []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const create = async () => {
    if (!product || !quantity) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, quantity: parseInt(quantity) }),
      });
      const d = await r.json();
      setMsg({ ok: true, text: `Commande #${d.id} créée — Kafka notifie Nour automatiquement` });
      setProduct(""); setQuantity("");
      fetch_();
    } catch {
      setMsg({ ok: false, text: "Erreur de connexion — vérifiez que les services sont lancés" });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total commandes</span>
          <span className="stat-val" style={{ color: "var(--orange)" }}>{orders.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">En attente</span>
          <span className="stat-val" style={{ color: "var(--amber)" }}>
            {orders.filter(o => o.status === "pending").length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Livrés</span>
          <span className="stat-val" style={{ color: "var(--green)" }}>
            {orders.filter(o => o.status === "delivered").length}
          </span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <div className="card-accent" style={{ background: "var(--orange)" }} />
            Nouvelle commande
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)", marginBottom: 18 }}>
            Order Service · Mayssa · :50051
          </p>
          <FormInput label="Produit" value={product} onChange={setProduct} placeholder="ex: Laptop Pro" />
          <FormInput label="Quantité" value={quantity} onChange={setQuantity} placeholder="ex: 2" type="number" />
          <button
            className="btn btn-orange"
            onClick={create}
            disabled={loading || !product || !quantity}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "Envoi en cours..." : "→ Créer la commande"}
          </button>
          {msg && (
            <div className={`status-msg ${msg.ok ? "status-ok" : "status-err"}`}>
              {msg.text}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="card-accent" style={{ background: "var(--orange)" }} />
              Toutes les commandes
            </div>
            <button className="btn btn-ghost" onClick={fetch_} style={{ padding: "5px 10px", fontSize: 11 }}>
              ↻ Actualiser
            </button>
          </div>

          {orders.length === 0 ? (
            <EmptyState icon="📦" text="Aucune commande — créez-en une !" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th><th>Produit</th><th>Qté</th><th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><span className="id-cell" style={{ color: "var(--orange)" }}>#{o.id}</span></td>
                    <td style={{ color: "#E8E6E0", fontWeight: 600 }}>{o.product}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>{o.quantity}</td>
                    <td><Badge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Delivery Tab ─────────────────────────────────────────────────────────────

function DeliveryTab() {
  const [deliveries, setDeliveries] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState(null);

  const fetch_ = useCallback(() =>
    fetch(`${API}/delivery`).then(r => r.json()).then(setDeliveries).catch(() => {}), []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const assign = async () => {
    setMsg(null);
    try {
      const r = await fetch(`${API}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: parseInt(orderId), address }),
      });
      const d = await r.json();
      setMsg({ ok: true, text: `Livraison ${d.id} assignée avec succès` });
      setOrderId(""); setAddress("");
      fetch_();
    } catch {
      setMsg({ ok: false, text: "Erreur de connexion" });
    }
  };

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total livraisons</span>
          <span className="stat-val" style={{ color: "var(--green)" }}>{deliveries.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Via Kafka (auto)</span>
          <span className="stat-val" style={{ color: "var(--amber)" }}>
            {deliveries.filter(d => d.id?.includes("AUTO")).length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Manuelles</span>
          <span className="stat-val" style={{ color: "var(--orange)" }}>
            {deliveries.filter(d => !d.id?.includes("AUTO")).length}
          </span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">
            <div className="card-accent" style={{ background: "var(--green)" }} />
            Assigner une livraison
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)", marginBottom: 18 }}>
            Delivery Service · Nour · :50052
          </p>
          <FormInput label="ID commande" value={orderId} onChange={setOrderId} placeholder="ex: 1" type="number" />
          <FormInput label="Adresse" value={address} onChange={setAddress} placeholder="ex: 12 rue de Paris" />
          <button
            className="btn btn-green"
            onClick={assign}
            disabled={!orderId || !address}
            style={{ width: "100%", justifyContent: "center" }}
          >
            → Assigner la livraison
          </button>
          {msg && (
            <div className={`status-msg ${msg.ok ? "status-ok" : "status-err"}`}>{msg.text}</div>
          )}
          <div className="kafka-banner">
            <strong>⚡ Kafka automatique</strong><br />
            Quand Mayssa crée une commande, Kafka notifie ce service.
            Les livraisons auto (DEL-AUTO-*) apparaissent dans la liste.
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="card-accent" style={{ background: "var(--green)" }} />
              Toutes les livraisons
            </div>
            <button className="btn btn-ghost" onClick={fetch_} style={{ padding: "5px 10px", fontSize: 11 }}>
              ↻ Actualiser
            </button>
          </div>

          {deliveries.length === 0 ? (
            <EmptyState icon="🚚" text="Aucune livraison pour l'instant" />
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Commande</th><th>Adresse</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id}>
                    <td>
                      <span className="id-cell" style={{ color: "var(--green)", fontSize: 10 }}>
                        {d.id}
                        {d.id?.includes("AUTO") && (
                          <span style={{ marginLeft: 5, background: "rgba(245,166,35,0.15)", color: "var(--amber)", fontSize: 9, padding: "1px 5px", borderRadius: 4 }}>
                            kafka
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--mono)" }}>#{d.order_id}</td>
                    <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.address}
                    </td>
                    <td><Badge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tracking Tab ─────────────────────────────────────────────────────────────

function TrackingTab() {
  const [tracks, setTracks] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTracks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/track`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setTracks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchTracks();
    const interval = setInterval(fetchTracks, 3000);
    return () => clearInterval(interval);
  }, [fetchTracks]);

  const track = async () => {
    if (!orderId) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(`${API}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: Number(orderId) }),
      });
      if (!r.ok) throw new Error("Backend error");
      const d = await r.json();
      setMsg({
        ok: true,
        text: `Suivi ${d.id} créé — ${d.location || "position inconnue"}`,
      });
      setOrderId("");
      fetchTracks();
    } catch {
      setMsg({ ok: false, text: "Erreur backend / API non disponible" });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Tracking actifs</span>
          <span className="stat-val" style={{ color: "var(--purple)" }}>{tracks.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">En cours</span>
          <span className="stat-val" style={{ color: "var(--amber)" }}>
            {tracks.filter(t => t.status === "en cours").length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Livrés</span>
          <span className="stat-val" style={{ color: "var(--green)" }}>
            {tracks.filter(t => t.status === "delivered").length}
          </span>
        </div>
      </div>

      <div className="grid-2">
        {/* FORM */}
        <div className="card">
          <div className="card-title">
            <div className="card-accent" style={{ background: "var(--purple)" }} />
            Nouveau tracking
          </div>
          <FormInput
            label="ID commande"
            value={orderId}
            onChange={setOrderId}
            placeholder="ex: 1"
            type="number"
          />
          <button
            className="btn btn-purple"
            onClick={track}
            disabled={!orderId || loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "Création..." : "→ Créer tracking"}
          </button>
          {msg && (
            <div className={`status-msg ${msg.ok ? "status-ok" : "status-err"}`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* TABLE ONLY — no map */}
        <div className="card">
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="card-accent" style={{ background: "var(--purple)" }} />
              Tracking temps réel
            </div>
            <button className="btn btn-ghost" onClick={fetchTracks} style={{ padding: "5px 10px", fontSize: 11 }}>
              ↻ Actualiser
            </button>
          </div>

          {tracks.length === 0 ? (
            <EmptyState icon="📍" text="Aucun tracking actif" />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Commande</th>
                  <th>Location</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map(t => (
                  <tr key={t.id}>
                    <td className="id-cell" style={{ color: "var(--purple)" }}>{t.id}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>#{t.order_id}</td>
                    <td style={{ color: "var(--text-mid)" }}>{t.location || "—"}</td>
                    <td><Badge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── GraphQL Tab ──────────────────────────────────────────────────────────────

const GQL_EXAMPLES = [
  { label: "getOrders", query: `query {\n  getOrders {\n    id\n    product\n    quantity\n    status\n  }\n}` },
  { label: "getDeliveries", query: `query {\n  getDeliveries {\n    id\n    order_id\n    address\n    status\n  }\n}` },
  { label: "getAllTracks", query: `query {\n  getAllTracks {\n    id\n    order_id\n    location\n    status\n  }\n}` },
  { label: "createOrder", query: `mutation {\n  createOrder(product: "Laptop", quantity: 2) {\n    id\n    product\n    status\n  }\n}` },
  { label: "updateOrderStatus", query: `mutation {\n  updateOrderStatus(id: 1, status: "shipped") {\n    id\n    status\n  }\n}` },
];

function GraphQLTab() {
  const [query, setQuery] = useState(GQL_EXAMPLES[0].query);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const run = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const d = await r.json();
      setResult(JSON.stringify(d, null, 2));
    } catch (e) {
      setResult("// Erreur: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {GQL_EXAMPLES.map((ex, i) => (
          <button
            key={ex.label}
            className={`gql-chip ${active === i ? "active" : ""}`}
            onClick={() => { setQuery(ex.query); setActive(i); }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            background: "var(--surface2)", padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", fontFamily: "var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Requête
            </span>
            <button className="btn btn-purple" onClick={run} disabled={loading} style={{ padding: "6px 14px", fontSize: 12 }}>
              {loading ? "..." : "▶ Exécuter"}
            </button>
          </div>
          <textarea
            className="gql-editor"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ borderRadius: 0, border: "none" }}
          />
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            background: "var(--surface2)", padding: "12px 16px",
            borderBottom: "1px solid var(--border)"
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", fontFamily: "var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Résultat
            </span>
          </div>
          <pre className="gql-result" style={{ borderRadius: 0, border: "none" }}>
            {result || "// ← Exécutez une requête\n// pour voir le résultat ici"}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(155,124,248,0.06)", border: "1px solid rgba(155,124,248,0.15)", borderRadius: 10, fontSize: 11, color: "rgba(155,124,248,0.8)", fontFamily: "var(--mono)" }}>
        Playground complet disponible sur <strong>http://localhost:3000/graphql</strong>
      </div>
    </div>
  );
}

// ── Architecture Tab ──────────────────────────────────────────────────────────

function ArchTab() {
  return (
    <div>
      <div className="card" style={{ marginBottom: 20, padding: "24px" }}>
        <div className="card-title">
          <div className="card-accent" style={{ background: "rgba(232,230,224,0.3)" }} />
          Schéma d'architecture
        </div>
        <div style={{ overflowX: "auto" }}>
          <svg viewBox="0 0 760 400" style={{ width: "100%", maxWidth: 760 }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="a" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="rgba(232,230,224,0.3)" />
              </marker>
              <marker id="b" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#FF6B35" />
              </marker>
              <marker id="c" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#3ECFA0" />
              </marker>
              <marker id="d" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#F5A623" />
              </marker>
            </defs>

            <rect x="290" y="15" width="180" height="52" rx="10" fill="#1E1E23" stroke="rgba(232,230,224,0.15)" strokeWidth="1" />
            <text x="380" y="38" textAnchor="middle" fontSize="13" fontWeight="700" fill="#E8E6E0">Client</text>
            <text x="380" y="55" textAnchor="middle" fontSize="10" fill="rgba(232,230,224,0.45)" fontFamily="'IBM Plex Mono', monospace">Web / Mobile</text>

            <line x1="380" y1="67" x2="380" y2="100" stroke="rgba(232,230,224,0.25)" strokeWidth="1" markerEnd="url(#a)" />
            <text x="390" y="88" fontSize="9" fill="rgba(232,230,224,0.35)" fontFamily="'IBM Plex Mono', monospace">REST + GraphQL</text>

            <rect x="220" y="100" width="320" height="60" rx="10" fill="#1E1E23" stroke="#9B7CF8" strokeWidth="1.5" />
            <text x="380" y="126" textAnchor="middle" fontSize="14" fontWeight="800" fill="#9B7CF8">API Gateway</text>
            <text x="380" y="148" textAnchor="middle" fontSize="10" fill="rgba(155,124,248,0.65)" fontFamily="'IBM Plex Mono', monospace">Express + Apollo · :3000</text>

            <line x1="290" y1="160" x2="150" y2="210" stroke="#FF6B35" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#b)" />
            <line x1="380" y1="160" x2="380" y2="210" stroke="#3ECFA0" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#c)" />
            <line x1="470" y1="160" x2="610" y2="210" stroke="#9B7CF8" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#d)" />

            <text x="200" y="193" fontSize="9" fill="#FF6B35" fontFamily="'IBM Plex Mono', monospace">gRPC</text>
            <text x="350" y="193" fontSize="9" fill="#3ECFA0" fontFamily="'IBM Plex Mono', monospace">gRPC</text>
            <text x="510" y="193" fontSize="9" fill="#9B7CF8" fontFamily="'IBM Plex Mono', monospace">gRPC</text>

            <rect x="55" y="210" width="185" height="72" rx="10" fill="#1E1E23" stroke="#FF6B35" strokeWidth="1.5" />
            <text x="147" y="233" textAnchor="middle" fontSize="12" fontWeight="700" fill="#FF6B35">Order Service</text>
            <text x="147" y="250" textAnchor="middle" fontSize="9" fill="rgba(255,107,53,0.65)" fontFamily="'IBM Plex Mono', monospace">Mayssa · :50051</text>
            <text x="147" y="267" textAnchor="middle" fontSize="9" fill="rgba(255,107,53,0.5)" fontFamily="'IBM Plex Mono', monospace">SQLite · Kafka Producer</text>

            <rect x="285" y="210" width="190" height="72" rx="10" fill="#1E1E23" stroke="#3ECFA0" strokeWidth="1.5" />
            <text x="380" y="233" textAnchor="middle" fontSize="12" fontWeight="700" fill="#3ECFA0">Delivery Service</text>
            <text x="380" y="250" textAnchor="middle" fontSize="9" fill="rgba(62,207,160,0.65)" fontFamily="'IBM Plex Mono', monospace">Nour · :50052</text>
            <text x="380" y="267" textAnchor="middle" fontSize="9" fill="rgba(62,207,160,0.5)" fontFamily="'IBM Plex Mono', monospace">In-memory · Kafka Consumer</text>

            <rect x="520" y="210" width="185" height="72" rx="10" fill="#1E1E23" stroke="#9B7CF8" strokeWidth="1.5" />
            <text x="612" y="233" textAnchor="middle" fontSize="12" fontWeight="700" fill="#9B7CF8">Tracking Service</text>
            <text x="612" y="250" textAnchor="middle" fontSize="9" fill="rgba(155,124,248,0.65)" fontFamily="'IBM Plex Mono', monospace">Nour · :50053</text>
            <text x="612" y="267" textAnchor="middle" fontSize="9" fill="rgba(155,124,248,0.5)" fontFamily="'IBM Plex Mono', monospace">In-memory</text>

            <rect x="240" y="325" width="280" height="58" rx="10" fill="#1E1E23" stroke="#F5A623" strokeWidth="1.5" />
            <text x="380" y="349" textAnchor="middle" fontSize="13" fontWeight="800" fill="#F5A623">Apache Kafka</text>
            <text x="380" y="368" textAnchor="middle" fontSize="9" fill="rgba(245,166,35,0.6)" fontFamily="'IBM Plex Mono', monospace">topic: order-topic · :9092</text>

            <line x1="147" y1="282" x2="270" y2="325" stroke="#F5A623" strokeWidth="1" strokeDasharray="5,3" markerEnd="url(#d)" />
            <text x="170" y="318" fontSize="9" fill="rgba(245,166,35,0.7)" fontFamily="'IBM Plex Mono', monospace">produce</text>

            <line x1="380" y1="325" x2="380" y2="282" stroke="#F5A623" strokeWidth="1" strokeDasharray="5,3" markerEnd="url(#d)" />
            <text x="386" y="310" fontSize="9" fill="rgba(245,166,35,0.7)" fontFamily="'IBM Plex Mono', monospace">consume</text>
          </svg>
        </div>
      </div>

      <div className="grid-3">
        {[
          {
            color: "var(--orange)", title: "order.proto",
            methods: ["CreateOrder", "GetOrder", "GetOrders", "UpdateOrder", "DeleteOrder"]
          },
          {
            color: "var(--green)", title: "delivery.proto",
            methods: ["AssignDelivery", "GetDelivery", "GetDeliveries", "UpdateDeliveryStatus"]
          },
          {
            color: "var(--purple)", title: "tracking.proto",
            methods: ["TrackOrder", "GetAllTracks", "UpdateLocation"]
          },
        ].map(p => (
          <div key={p.title} className="proto-card">
            <div className="proto-title" style={{ color: p.color }}>
              <span style={{ fontFamily: "var(--mono)" }}>📁</span>
              {p.title}
            </div>
            {p.methods.map(m => (
              <div key={m} className="method-item">
                <div className="method-dot" style={{ background: p.color }} />
                {m}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "orders", label: "Orders", icon: "📦", cls: "order", sub: "Mayssa · :50051" },
  { id: "delivery", label: "Delivery", icon: "🚚", cls: "delivery", sub: "Nour · :50052" },
  { id: "tracking", label: "Tracking", icon: "📍", cls: "tracking", sub: ":50053" },
  { id: "graphql", label: "GraphQL", icon: "🔮", cls: "graphql", sub: "Apollo · :3000" },
  { id: "arch", label: "Architecture", icon: "🗺️", cls: "arch", sub: "Schéma SOA" },
];

const TAB_CONTENT = {
  orders: <OrdersTab />,
  delivery: <DeliveryTab />,
  tracking: <TrackingTab />,
  graphql: <GraphQLTab />,
  arch: <ArchTab />,
};

const TAB_META = {
  orders: { title: "Order Service", sub: "gRPC · SQLite · Kafka Producer — Mayssa · port 50051" },
  delivery: { title: "Delivery Service", sub: "gRPC · Kafka Consumer — Nour · port 50052" },
  tracking: { title: "Tracking Service", sub: "gRPC · In-memory — Nour · port 50053" },
  graphql: { title: "GraphQL Playground", sub: "Apollo Server · Express Gateway — port 3000" },
  arch: { title: "Architecture SOA", sub: "gRPC + Kafka + REST + GraphQL — Vue d'ensemble" },
};

export default function App() {
  const [tab, setTab] = useState("orders");
  const meta = TAB_META[tab];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-badge">
              <div className="logo-dot" />
              <span className="logo-text">LIVE</span>
            </div>
            <div className="sidebar-title">Delivery<br />System</div>
            <div className="sidebar-subtitle">SOA Microservices</div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section">Services</div>
            {TABS.map(t => (
              <button
                key={t.id}
                className={`nav-btn ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <div className={`nav-icon ${t.cls}`}>{t.icon}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>{t.label}</span>
                  <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--mono)", fontWeight: 400 }}>
                    {t.sub}
                  </span>
                </div>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--mono)", marginBottom: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Services status
            </div>
            {[
              { label: "Order :50051", color: "#FF6B35" },
              { label: "Delivery :50052", color: "#3ECFA0" },
              { label: "Tracking :50053", color: "#9B7CF8" },
              { label: "Gateway :3000", color: "#F5A623" },
            ].map(s => (
              <div key={s.label} className="service-pill">
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div className="service-dot" style={{ background: s.color }} />
                  <span style={{ fontSize: 10, color: "var(--text-mid)", fontFamily: "var(--mono)" }}>{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="topbar-left">
              <div className="page-title">{meta.title}</div>
              <div className="page-sub">{meta.sub}</div>
            </div>
            <div className="topbar-actions">
              <div style={{
                background: "rgba(62,207,160,0.1)",
                border: "1px solid rgba(62,207,160,0.2)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 11,
                color: "var(--green)",
                fontFamily: "var(--mono)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} />
                Gateway online
              </div>
            </div>
          </div>

          <div className="content">
            {TAB_CONTENT[tab]}
          </div>
        </main>
      </div>
    </>
  );
}