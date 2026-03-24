import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import "./AdminDashboard.css";
import logo from "../PopSeat_Logo.png";

// APIs USED:
//   GET /api/cinema               ✅ — all theaters
//   GET /api/orders?cinemaId=     ✅ — food order revenue per theater
//   PUT /api/cinema/:id           ✅ — approve/disable theater
//   GET /api/admin/profile        ✅ — admin profile

const API_BASE = "https://popseat.onrender.com/api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    localStorage.getItem("adminToken") || localStorage.getItem("token") || ""
  }`,
});

const formatTime = (t) => {
  if (!t) return "—";
  let [h, m] = t.split(":");
  h = parseInt(h, 10);
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// ── Mock subscription revenue ──
const MOCK_REVENUE = {
  daily: [
    { label: "Mon", revenue: 2400, subs: 3 }, { label: "Tue", revenue: 1800, subs: 2 },
    { label: "Wed", revenue: 3200, subs: 4 }, { label: "Thu", revenue: 2900, subs: 3 },
    { label: "Fri", revenue: 4100, subs: 5 }, { label: "Sat", revenue: 5200, subs: 6 },
    { label: "Sun", revenue: 3800, subs: 4 },
  ],
  weekly: [
    { label: "Week 1", revenue: 18400, subs: 22 }, { label: "Week 2", revenue: 22100, subs: 27 },
    { label: "Week 3", revenue: 19800, subs: 24 }, { label: "Week 4", revenue: 28500, subs: 34 },
  ],
  monthly: [
    { label: "Jan", revenue: 45000, subs: 54 },  { label: "Feb", revenue: 52000, subs: 62 },
    { label: "Mar", revenue: 48000, subs: 58 },  { label: "Apr", revenue: 61000, subs: 73 },
    { label: "May", revenue: 55000, subs: 66 },  { label: "Jun", revenue: 72000, subs: 86 },
    { label: "Jul", revenue: 68000, subs: 81 },  { label: "Aug", revenue: 79000, subs: 94 },
    { label: "Sep", revenue: 83000, subs: 99 },  { label: "Oct", revenue: 91000, subs: 108 },
    { label: "Nov", revenue: 88000, subs: 105 }, { label: "Dec", revenue: 105000, subs: 125 },
  ],
  yearly: [
    { label: "2022", revenue: 380000, subs: 456 }, { label: "2023", revenue: 620000, subs: 744 },
    { label: "2024", revenue: 890000, subs: 1068 }, { label: "2025", revenue: 1120000, subs: 1344 },
  ],
};

// ── Mock subscription transactions ──
const MOCK_TRANSACTIONS = [
  { id: "TXN001", owner: "Hitesh Patel",  theater: "PVR Ahmedabad",  plan: "Pro",        amount: 2000, status: "paid",     date: "2026-03-20" },
  { id: "TXN002", owner: "Suresh Shah",   theater: "INOX Surat",     plan: "Basic",      amount: 800,  status: "paid",     date: "2026-03-19" },
  { id: "TXN003", owner: "Rajan Mehta",   theater: "Cinepolis Pune", plan: "Standard",   amount: 1300, status: "pending",  date: "2026-03-19" },
  { id: "TXN004", owner: "Anil Gupta",    theater: "PVR Mumbai",     plan: "Enterprise", amount: 2500, status: "paid",     date: "2026-03-18" },
  { id: "TXN005", owner: "Mohan Kumar",   theater: "SPI Bangalore",  plan: "Pro",        amount: 2000, status: "refunded", date: "2026-03-17" },
  { id: "TXN006", owner: "Deepak Singh",  theater: "INOX Delhi",     plan: "Basic",      amount: 800,  status: "pending",  date: "2026-03-17" },
  { id: "TXN007", owner: "Vikram Nair",   theater: "Miraj Chennai",  plan: "Standard",   amount: 1300, status: "paid",     date: "2026-03-16" },
  { id: "TXN008", owner: "Sita Reddy",    theater: "PVR Hyderabad",  plan: "Pro",        amount: 2000, status: "paid",     date: "2026-03-15" },
];

// ── Mock payouts ──
const MOCK_PAYOUTS = [
  { id: "PAY001", owner: "Hitesh Patel", theater: "PVR Ahmedabad",  amount: 1600, status: "pending", dueDate: "2026-03-25" },
  { id: "PAY002", owner: "Suresh Shah",  theater: "INOX Surat",     amount: 640,  status: "paid",    dueDate: "2026-03-20" },
  { id: "PAY003", owner: "Rajan Mehta",  theater: "Cinepolis Pune", amount: 1040, status: "pending", dueDate: "2026-03-26" },
  { id: "PAY004", owner: "Anil Gupta",   theater: "PVR Mumbai",     amount: 2000, status: "paid",    dueDate: "2026-03-18" },
  { id: "PAY005", owner: "Mohan Kumar",  theater: "SPI Bangalore",  amount: 1600, status: "pending", dueDate: "2026-03-27" },
];

const PLAN_COLOR = {
  Basic: "#6366f1", Standard: "#8b5cf6",
  Pro: "#a855f7", Enterprise: "#ec4899",
};

// Commission tab removed from TABS
const TABS = [
  { key: "overview",      label: "Overview",      icon: "⬡" },
  { key: "subscriptions", label: "Subscriptions", icon: "◈" },
  { key: "payments",      label: "Payments",      icon: "◎" },
  { key: "theaters",      label: "Theaters",      icon: "◫" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="adm-tooltip">
      <div className="adm-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="adm-tooltip-row" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span>{p.name === "revenue" ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [activeTab,     setActiveTab]     = useState("overview");
  const [theaters,      setTheaters]      = useState([]);
  const [adminProfile,  setAdminProfile]  = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error,         setError]         = useState("");
  const [revenueRange,  setRevenueRange]  = useState("monthly");
  const [transactions,  setTransactions]  = useState(MOCK_TRANSACTIONS);
  const [payouts,       setPayouts]       = useState(MOCK_PAYOUTS);
  const [txSearch,      setTxSearch]      = useState("");
  const [txFilter,      setTxFilter]      = useState("all");
  const [theaterSearch, setTheaterSearch] = useState("");
  const [theaterFilter, setTheaterFilter] = useState("all");

  /* ── Auth guard ── */
  useEffect(() => {
    const role = (localStorage.getItem("adminRole") || localStorage.getItem("role") || "").toLowerCase();
    if (role !== "admin") navigate("/admin-login", { replace: true });
  }, [navigate]);

  /* ── Load admin profile — GET /api/admin/profile ✅ ── */
  const loadProfile = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/admin/profile`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAdminProfile(data.admin);
    } catch { /* silent */ }
  }, []);

  /* ── Load theaters — GET /api/cinema ✅ ── */
  const loadTheaters = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_BASE}/cinema`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setTheaters(data.cinemas || []);
      } else {
        setError(data.message || "Failed to load theaters.");
      }
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProfile(); loadTheaters(); }, [loadProfile, loadTheaters]);

  /* ── Approve / Disable — PUT /api/cinema/:id ✅ ── */
  const updateTheaterStatus = async (cinemaId, isActive) => {
    setActionLoading((p) => ({ ...p, [cinemaId]: true }));
    try {
      const res  = await fetch(`${API_BASE}/cinema/${cinemaId}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (data.success)
        setTheaters((p) => p.map((t) => t._id === cinemaId ? { ...t, isActive } : t));
      else setError(data.message || "Failed to update.");
    } catch { setError("Network error."); }
    finally { setActionLoading((p) => ({ ...p, [cinemaId]: false })); }
  };

  /* ── Release payout ── */
  const releasePayout = (id) =>
    setPayouts((p) => p.map((pay) => pay.id === id ? { ...pay, status: "paid" } : pay));

  /* ── Logout ── */
  const logout = () => {
    ["adminToken", "adminEmail", "adminRole", "token", "email", "role"].forEach(
      (k) => localStorage.removeItem(k)
    );
    navigate("/admin-login");
  };

  /* ── Theater counts ── */
  const activeTheaters  = theaters.filter((t) =>  t.isActive).length;
  const pendingTheaters = theaters.filter((t) => !t.isActive).length;

  /* ── Subscription stats ── */
  const paidTx      = useMemo(() => transactions.filter((t) => t.status === "paid"),    [transactions]);
  const pendingTx   = useMemo(() => transactions.filter((t) => t.status === "pending"), [transactions]);
  const subRevenue  = useMemo(() => paidTx.reduce((s, t) => s + t.amount, 0),           [paidTx]);

  const completedPayouts = useMemo(
    () => payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0),
    [payouts]
  );
  const pendingPayoutsTotal = useMemo(
    () => payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
    [payouts]
  );

  /* ── Filtered transactions ── */
  const filteredTx = useMemo(() =>
    transactions.filter((t) => {
      const ms = txFilter === "all" || t.status === txFilter;
      const mq = !txSearch ||
        t.owner.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.theater.toLowerCase().includes(txSearch.toLowerCase());
      return ms && mq;
    }), [transactions, txFilter, txSearch]);

  /* ── Filtered theaters ── */
  const filteredTheaters = useMemo(() =>
    theaters.filter((t) => {
      const mq = !theaterSearch ||
        t.name?.toLowerCase().includes(theaterSearch.toLowerCase()) ||
        t.ownerName?.toLowerCase().includes(theaterSearch.toLowerCase()) ||
        t.city?.toLowerCase().includes(theaterSearch.toLowerCase());
      const mf =
        theaterFilter === "all" ||
        (theaterFilter === "active"  &&  t.isActive) ||
        (theaterFilter === "pending" && !t.isActive);
      return mq && mf;
    }), [theaters, theaterSearch, theaterFilter]);

  if (loading) return (
    <div className="adm-loading">
      <img src={logo} className="adm-loading-logo" alt="PopSeat" />
      <p>Loading admin panel...</p>
    </div>
  );

  const StatCard = ({ label, value, sub, accent, icon }) => (
    <div className={`adm-stat-card ${accent || ""}`}>
      <div className="adm-stat-icon">{icon}</div>
      <div className="adm-stat-num">{value}</div>
      <div className="adm-stat-label">{label}</div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </div>
  );

  return (
    <div className="adm-root">

      {/* ══ SIDEBAR ══ */}
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <img src={logo} alt="PopSeat" />
          <span>PopSeat</span>
        </div>
        <div className="adm-sidebar-label">PLATFORM</div>
        <nav className="adm-nav">
          {TABS.map((tab) => (
            <button key={tab.key}
              className={`adm-nav-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="adm-nav-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <div className="adm-admin-info">
            <div className="adm-avatar">
              {(adminProfile?.email || "A")[0].toUpperCase()}
            </div>
            <div className="adm-admin-text">
              <div className="adm-admin-role">Super Admin</div>
              <div className="adm-admin-email">
                {adminProfile?.email || localStorage.getItem("adminEmail") || "admin"}
              </div>
            </div>
          </div>
          <button className="adm-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="adm-main">

        <div className="adm-topbar">
          <div>
            <h1 className="adm-page-title">
              {TABS.find((t) => t.key === activeTab)?.label}
            </h1>
            <p className="adm-page-sub">
              {activeTab === "overview"      && "Platform revenue and theater overview"}
              {activeTab === "subscriptions" && "Subscription revenue trends and plan analytics"}
              {activeTab === "payments"      && "Subscription transactions and owner payouts"}
              {activeTab === "theaters"      && "Manage and approve theater registrations"}
            </p>
          </div>
          <button className="adm-refresh-btn" onClick={loadTheaters}>↻ Refresh</button>
        </div>

        {error && (
          <div className="adm-error-bar">
            {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: OVERVIEW
        ══════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="adm-fade-in">

            <div className="adm-kpi-grid">
              <StatCard icon="⬡" label="Subscription Revenue" value={fmt(subRevenue)}
                accent="accent" sub={`${paidTx.length} paid plans`} />
              <StatCard icon="◫" label="Active Theaters"       value={activeTheaters}
                accent="green"  sub="Approved & live" />
              <StatCard icon="○" label="Pending Approvals"     value={pendingTheaters}
                accent="amber"  sub="Awaiting review" />
              <StatCard icon="◎" label="Total Theaters"        value={theaters.length}
                accent="blue"   sub="All registered" />
              <StatCard icon="✦" label="Paid Payouts"          value={fmt(completedPayouts)}
                accent="green"  sub="Released to owners" />
            </div>

            <div className="adm-overview-row">

              <div className="adm-card adm-chart-card">
                <div className="adm-card-header">
                  <div className="adm-card-title">Subscription Revenue (Last 6 Months)</div>
                </div>
                <div style={{ padding: "12px 8px 4px" }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={MOCK_REVENUE.monthly.slice(-6)}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" name="revenue"
                        stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="adm-card adm-quick-stats">
                <div className="adm-card-title" style={{ marginBottom: 14 }}>Revenue Breakdown</div>
                {[
                  { label: "Subscription Revenue",  value: fmt(subRevenue),                                              color: "#6366f1" },
                  { label: "Pending Sub Payments",  value: fmt(pendingTx.reduce((s,t)=>s+t.amount,0)),                  color: "#d97706" },
                  { label: "Pending Payouts",        value: fmt(pendingPayoutsTotal),                                    color: "#dc2626" },
                  { label: "Completed Payouts",      value: fmt(completedPayouts),                                       color: "#16a34a" },
                ].map((item) => (
                  <div key={item.label} className="adm-health-row">
                    <span className="adm-health-label">{item.label}</span>
                    <span className="adm-health-value" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>

            </div>

          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: SUBSCRIPTIONS
        ══════════════════════════════════════ */}
        {activeTab === "subscriptions" && (
          <div className="adm-fade-in">

            <div className="adm-kpi-grid">
              <StatCard icon="◈" label="Total Sub Revenue" value={fmt(subRevenue)}  accent="accent" />
              <StatCard icon="✦" label="Active Plans"      value={activeTheaters}   accent="green"  />
              <StatCard icon="○" label="Pending Plans"     value={pendingTheaters}  accent="amber"  />
              <StatCard icon="◎" label="Avg Plan Value"    value={fmt(subRevenue / (paidTx.length || 1))} accent="blue" />
            </div>

            <div className="adm-card" style={{ marginBottom: 20 }}>
              <div className="adm-card-header">
                <div className="adm-card-title">Subscription Revenue</div>
                <div className="adm-seg-btns">
                  {["daily", "weekly", "monthly", "yearly"].map((r) => (
                    <button key={r}
                      className={`adm-seg-btn ${revenueRange === r ? "active" : ""}`}
                      onClick={() => setRevenueRange(r)}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: "12px 8px 4px" }}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={MOCK_REVENUE[revenueRange]}>
                    <defs>
                      <linearGradient id="subRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="subCntGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area yAxisId="left"  type="monotone" dataKey="revenue" name="revenue"
                      stroke="#6366f1" strokeWidth={2} fill="url(#subRevGrad)" dot={false} />
                    <Area yAxisId="right" type="monotone" dataKey="subs" name="subscriptions"
                      stroke="#8b5cf6" strokeWidth={2} fill="url(#subCntGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-card-header">
                <div className="adm-card-title">Revenue by Plan</div>
              </div>
              <div style={{ padding: "12px 8px 4px" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart barSize={40} data={["Basic", "Standard", "Pro", "Enterprise"].map((plan) => ({
                    plan,
                    revenue: transactions.filter(t => t.plan === plan && t.status === "paid").reduce((s, t) => s + t.amount, 0),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="plan" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="revenue" radius={[6, 6, 0, 0]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: PAYMENTS
        ══════════════════════════════════════ */}
        {activeTab === "payments" && (
          <div className="adm-fade-in">

            <div className="adm-kpi-grid">
              <StatCard icon="◎" label="Total Collected"  value={fmt(subRevenue)}          accent="accent" sub="From subscriptions" />
              <StatCard icon="✦" label="Paid to Owners"   value={fmt(completedPayouts)}    accent="green"  sub="Released" />
              <StatCard icon="◈" label="Pending Payouts"  value={fmt(pendingPayoutsTotal)} accent="amber"  sub="To be released" />
              <StatCard icon="⬡" label="Platform Balance" value={fmt(subRevenue - completedPayouts - pendingPayoutsTotal)} accent="blue" sub="Net retained" />
            </div>

            {/* Subscription Transactions */}
            <div className="adm-card" style={{ marginBottom: 20 }}>
              <div className="adm-card-header">
                <div className="adm-card-title">Subscription Transactions</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input className="adm-mini-search" placeholder="Search owner / theater..."
                    value={txSearch} onChange={(e) => setTxSearch(e.target.value)} />
                  <div className="adm-seg-btns">
                    {["all", "paid", "pending", "refunded"].map((s) => (
                      <button key={s}
                        className={`adm-seg-btn ${txFilter === s ? "active" : ""}`}
                        onClick={() => setTxFilter(s)}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr>
                    <th>ID</th><th>Owner</th><th>Theater</th>
                    <th>Plan</th><th>Amount</th><th>Status</th><th>Date</th>
                  </tr></thead>
                  <tbody>
                    {filteredTx.map((t) => (
                      <tr key={t.id}>
                        <td><span className="adm-tx-id">{t.id}</span></td>
                        <td className="adm-fw">{t.owner}</td>
                        <td className="adm-muted">{t.theater}</td>
                        <td>
                          <span className="adm-plan-badge"
                            style={{ background: PLAN_COLOR[t.plan] + "18", color: PLAN_COLOR[t.plan] }}>
                            {t.plan}
                          </span>
                        </td>
                        <td className="adm-amount">{fmt(t.amount)}</td>
                        <td><span className={`adm-status-pill ${t.status}`}>{t.status}</span></td>
                        <td className="adm-muted">{t.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Owner Payouts */}
            <div className="adm-card">
              <div className="adm-card-header">
                <div className="adm-card-title">Owner Payouts</div>
                <div className="adm-badge-row">
                  <span className="adm-badge amber">{payouts.filter(p => p.status === "pending").length} pending</span>
                  <span className="adm-badge green">{payouts.filter(p => p.status === "paid").length} completed</span>
                </div>
              </div>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr>
                    <th>Payout ID</th><th>Owner</th><th>Theater</th>
                    <th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th>
                  </tr></thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id}>
                        <td><span className="adm-tx-id">{p.id}</span></td>
                        <td className="adm-fw">{p.owner}</td>
                        <td className="adm-muted">{p.theater}</td>
                        <td className="adm-amount">{fmt(p.amount)}</td>
                        <td className="adm-muted">{p.dueDate}</td>
                        <td><span className={`adm-status-pill ${p.status}`}>{p.status}</span></td>
                        <td>
                          {p.status === "pending" ? (
                            <button className="adm-release-btn" onClick={() => releasePayout(p.id)}>
                              Release Payment
                            </button>
                          ) : (
                            <span className="adm-muted" style={{ fontSize: 12 }}>Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: THEATERS
        ══════════════════════════════════════ */}
        {activeTab === "theaters" && (
          <div className="adm-fade-in">

            <div className="adm-kpi-grid">
              <StatCard icon="◫" label="Total Theaters" value={theaters.length} accent="accent" />
              <StatCard icon="✦" label="Active"         value={activeTheaters}  accent="green"  />
              <StatCard icon="○" label="Pending"        value={pendingTheaters} accent="amber"  />
            </div>

            <div className="adm-controls-bar">
              <input className="adm-search-input" placeholder="Search theater, owner, city..."
                value={theaterSearch} onChange={(e) => setTheaterSearch(e.target.value)} />
              <div className="adm-seg-btns">
                {["all", "active", "pending"].map((f) => (
                  <button key={f}
                    className={`adm-seg-btn ${theaterFilter === f ? "active" : ""}`}
                    onClick={() => setTheaterFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-card">
              {filteredTheaters.length === 0 ? (
                <div className="adm-empty">
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🏛️</div>
                  <p>No theaters found</p>
                </div>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead><tr>
                      <th>Theater</th><th>Owner</th><th>Location</th>
                      <th>Contact</th><th>Screens</th><th>Hours</th>
                      <th>Status</th><th>Action</th>
                    </tr></thead>
                    <tbody>
                      {filteredTheaters.map((t) => (
                        <tr key={t._id}>
                          <td>
                            <div className="adm-fw">{t.name}</div>
                            <div className="adm-muted" style={{ fontSize: 11 }}>{t.branchName}</div>
                          </td>
                          <td>
                            <div>{t.ownerName || "—"}</div>
                            <div className="adm-muted" style={{ fontSize: 11 }}>{t.email || "—"}</div>
                          </td>
                          <td>
                            <div>{t.city || "—"}</div>
                            <div className="adm-muted" style={{ fontSize: 11 }}>{t.address || "—"}</div>
                          </td>
                          <td>{t.contactNumber || "—"}</td>
                          <td style={{ textAlign: "center" }}>{t.totalScreens || "—"}</td>
                          <td style={{ fontSize: 12 }}>
                            {formatTime(t.openingTime)}<br />{formatTime(t.closingTime)}
                          </td>
                          <td>
                            <span className={`adm-status-pill ${t.isActive ? "paid" : "pending"}`}>
                              {t.isActive ? "Active" : "Pending"}
                            </span>
                          </td>
                          <td>
                            {t.isActive ? (
                              <button className="adm-act-btn disable"
                                disabled={actionLoading[t._id]}
                                onClick={() => updateTheaterStatus(t._id, false)}>
                                {actionLoading[t._id] ? "..." : "Disable"}
                              </button>
                            ) : (
                              <button className="adm-act-btn approve"
                                disabled={actionLoading[t._id]}
                                onClick={() => updateTheaterStatus(t._id, true)}>
                                {actionLoading[t._id] ? "..." : "Approve"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;