import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import "./AdminDashboard.css";
import logo from "../PopSeat_Logo.png";

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


const PLAN_COLOR = {
  Basic: "#6366f1", Standard: "#8b5cf6",
  Pro: "#a855f7", Enterprise: "#ec4899",
};

const TABS = [
  { key: "overview",      label: "Overview",      icon: "⬡" },
  { key: "subscriptions", label: "Subscriptions", icon: "◈" },
  { key: "plans",         label: "Plans",         icon: "☷" },
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

  const [activeTab,       setActiveTab]       = useState("overview");
  const [theaters,        setTheaters]        = useState([]);
  const [adminProfile,    setAdminProfile]    = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [actionLoading,   setActionLoading]   = useState({});
  const [error,           setError]           = useState("");
  const [revenueRange,    setRevenueRange]    = useState("monthly");
  const [transactions,    setTransactions]    = useState([]);
  const [txSearch,        setTxSearch]        = useState("");
  const [txFilter,        setTxFilter]        = useState("all");
  const [theaterSearch,   setTheaterSearch]   = useState("");
  const [theaterFilter,   setTheaterFilter]   = useState("all");
  const [overviewMetric,  setOverviewMetric]  = useState("both"); // "revenue", "subs", "both"

  const [plans,           setPlans]           = useState([]);
  const [loadingPlans,    setLoadingPlans]    = useState(false);
  const [planModalOpen,   setPlanModalOpen]   = useState(false);
  const [planForm,        setPlanForm]        = useState({ _id: null, name: "", price: "", theaterLimit: "", duration: 30, features: "" });

  const [expandedTheaterId, setExpandedTheaterId] = useState(null);
  const [bankDetailsMap,    setBankDetailsMap]    = useState({});

  // ── Sidebar state ──
  // sidebarCollapsed: desktop toggle (hides sidebar, gives full width)
  // mobileSidebarOpen: mobile drawer open/close
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ── User stats state ──
  const [userStats, setUserStats] = useState({
    owners: 0,
    workers: 0,
    customers: 0,
  });

  // Detect mobile
  const isMobile = () => window.innerWidth <= 768;

  const toggleSidebar = () => {
    if (isMobile()) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  // Close mobile sidebar on tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (isMobile()) setMobileSidebarOpen(false);
  };

  // Build root class string
  const rootClasses = [
    "adm-root",
    sidebarCollapsed  ? "sidebar-collapsed"   : "",
    mobileSidebarOpen ? "mobile-sidebar-open" : "",
  ].filter(Boolean).join(" ");

  /* ── Auth guard ── */
  useEffect(() => {
    const role = (localStorage.getItem("adminRole") || localStorage.getItem("role") || "").toLowerCase();
    if (role !== "admin") navigate("/admin-login", { replace: true });
  }, [navigate]);

  /* ── Load admin profile ── */
  const loadProfile = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/admin/profile`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setAdminProfile(data.admin);
    } catch { /* silent */ }
  }, []);

  /* ── Load theaters ── */
  const loadTheaters = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/cinema`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setTheaters(data.cinemas || []);
      }
      else setError(data.message || "Failed to load theaters.");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, []);

  /* ── Load plans ── */
  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch(`${API_BASE}/admin/plans`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setPlans(data.plans || []);
    } catch { /* silent */ }
    finally { setLoadingPlans(false); }
  }, []);

  /* ── Load User Counts ── */
  const loadUserCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/user-counts`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.counts) {
        setUserStats(data.counts);
      }
    } catch { /* silent */ }
  }, []);

  /* ── Load Transactions ── */
  const loadTransactions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/transactions`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.transactions) {
        setTransactions(data.transactions);
      }
    } catch { /* silent */ }
  }, []);

  /* ── Load Bank Details ── */
  const loadBankDetails = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/bank-details`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.cinemas) {
        const map = {};
        data.cinemas.forEach(c => { map[c.id] = c.bankDetails; });
        setBankDetailsMap(map);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { 
    loadProfile(); 
    loadTheaters(); 
    loadPlans(); 
    loadUserCounts();
    loadTransactions();
    loadBankDetails();
  }, [loadProfile, loadTheaters, loadPlans, loadUserCounts, loadTransactions, loadBankDetails]);

  /* ── Plan Actions ── */
  const openPlanModal = (plan = null) => {
    if (plan) {
      setPlanForm({ ...plan, features: plan.features?.join("\n") || "" });
    } else {
      setPlanForm({ _id: null, name: "", price: "", theaterLimit: "", duration: 30, features: "" });
    }
    setPlanModalOpen(true);
  };

  const savePlan = async () => {
    const planId = planForm._id || planForm.id;
    const isEdit = !!planId;
    const url = isEdit ? `${API_BASE}/admin/plans/${planId}` : `${API_BASE}/admin/plans`;
    const method = isEdit ? "PUT" : "POST";
    
    const body = {
      name: planForm.name?.trim(),
      price: Number(planForm.price) || 0,
      theaterLimit: Number(planForm.theaterLimit) || 0,
      duration: Number(planForm.duration) || 30,
      features: (typeof planForm.features === "string" ? planForm.features : "").split("\n").map(f => f.trim()).filter(Boolean)
    };

    if (isEdit) {
      body.isActive = true;
    }

    if (!body.name) {
      setError("Plan Name is required.");
      return;
    }

    try {
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      
      let data = {};
      try { data = await res.json(); } catch (e) { /* ignore JSON error if server crashes */ }

      if (res.ok && data.success !== false) {
        setPlanModalOpen(false);
        loadPlans();
        setError(""); // clear any past errors
      } else {
        setError(data.message || `Error saving plan. (Code: ${res.status})`);
      }
    } catch { 
      setError("Network error while communicating with the server."); 
    }
  };

  const deletePlan = async (id) => {
    if (!window.confirm("Are you sure you want to delete/deactivate this plan?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/plans/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (data.success) loadPlans();
      else setError(data.message || "Failed to delete plan.");
    } catch { setError("Network error."); }
  };

  /* ── Approve / Disable ── */
  const updateTheaterStatus = async (cinemaId, isActive) => {
    setActionLoading((p) => ({ ...p, [cinemaId]: true }));
    try {
      const res  = await fetch(`${API_BASE}/admin/cinema/${cinemaId}/status`, {
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

  /* ── Logout ── */
  const logout = () => {
    ["adminToken", "adminEmail", "adminRole", "token", "email", "role"].forEach(
      (k) => localStorage.removeItem(k)
    );
    navigate("/admin-login");
  };

  /* ── Stats ── */
  const activeTheaters  = theaters.filter((t) =>  t.isActive).length;
  const pendingTheaters = theaters.filter((t) => !t.isActive).length;
  
  const paidStatuses = ["paid", "active", "upgraded"];
  const pendingStatuses = ["pending"];
  
  const paidTx      = useMemo(() => transactions.filter((t) => paidStatuses.includes(t.status?.toLowerCase())), [transactions]);
  const pendingTx   = useMemo(() => transactions.filter((t) => pendingStatuses.includes(t.status?.toLowerCase())), [transactions]);
  const subRevenue  = useMemo(() => paidTx.reduce((s, t) => s + Number(t.amount || 0), 0), [paidTx]);

  /* ── Filtered transactions ── */
  const filteredTx = useMemo(() =>
    transactions.filter((t) => {
      const normalizedStatus = t.status?.toLowerCase() || "";
      let isStatusMatch = false;
      if (txFilter === "all") isStatusMatch = true;
      else if (txFilter === "paid" && paidStatuses.includes(normalizedStatus)) isStatusMatch = true;
      else if (txFilter === "pending" && pendingStatuses.includes(normalizedStatus)) isStatusMatch = true;
      else if (txFilter === "refunded" && ["refunded", "cancelled"].includes(normalizedStatus)) isStatusMatch = true;
      else if (normalizedStatus === txFilter) isStatusMatch = true;

      const mq = !txSearch ||
        t.owner?.toLowerCase().includes(txSearch.toLowerCase()) ||
        t.theater?.toLowerCase().includes(txSearch.toLowerCase());
      return isStatusMatch && mq;
    }), [transactions, txFilter, txSearch]);

  /* ── Real Revenue Graph Data ── */
  const realRevenueData = useMemo(() => {
    const data = { daily: [], weekly: [], monthly: [], yearly: [] };
    const now = new Date();
    
    // Helper: Daily (Last 7 Days)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(now.getDate() - i);
      const label = days[d.getDay()];
      const dStr = d.toISOString().split("T")[0];
      const items = paidTx.filter(t => t.date?.startsWith(dStr));
      data.daily.push({ 
        label, 
        revenue: items.reduce((s, t) => s + Number(t.amount || 0), 0),
        subs: items.length 
      });
    }

    // Helper: Monthly (Current Year)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const curYear = now.getFullYear();
    months.forEach((m, idx) => {
      const prefix = `${curYear}-${String(idx + 1).padStart(2, "0")}`;
      const items = paidTx.filter(t => t.date?.startsWith(prefix));
      data.monthly.push({ 
        label: m, 
        revenue: items.reduce((s, t) => s + Number(t.amount || 0), 0),
        subs: items.length 
      });
    });

    // Helper: Weekly (Last 4 Weeks)
    for (let i = 3; i >= 0; i--) {
      const start = new Date(); start.setDate(now.getDate() - (i * 7 + 7));
      const end = new Date(); end.setDate(now.getDate() - (i * 7));
      const items = paidTx.filter(t => {
        const td = new Date(t.date);
        return td >= start && td <= end;
      });
      data.weekly.push({ 
        label: `Week ${4 - i}`, 
        revenue: items.reduce((s, t) => s + Number(t.amount || 0), 0),
        subs: items.length 
      });
    }

    // Helper: Yearly (Last 3 Years)
    for (let i = 2; i >= 0; i--) {
      const yr = curYear - i;
      const items = paidTx.filter(t => t.date?.startsWith(String(yr)));
      data.yearly.push({ 
        label: String(yr), 
        revenue: items.reduce((s, t) => s + Number(t.amount || 0), 0),
        subs: items.length 
      });
    }

    return data;
  }, [paidTx]);

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
    <div className={rootClasses}>

      {/* ── Mobile overlay (tap to close) ── */}
      <div className="adm-overlay" onClick={closeMobileSidebar} />

      {/* ══ SIDEBAR ══ */}
      <aside className="adm-sidebar">
        {/* Tap logo → toggle sidebar */}
        <div className="adm-brand" onClick={toggleSidebar} title="Toggle sidebar">
          <img src={logo} alt="PopSeat" />
          <span>PopSeat</span>
        </div>
        <div className="adm-sidebar-label">PLATFORM</div>
        <nav className="adm-nav">
          {TABS.map((tab) => (
            <button key={tab.key}
              className={`adm-nav-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => handleTabChange(tab.key)}
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
          <div className="adm-topbar-left">
            {/* Hamburger — shown on desktop when sidebar is collapsed */}
            <button className="adm-menu-toggle" onClick={toggleSidebar} aria-label="Open sidebar">
              ☰
            </button>
            <div>
              <h1 className="adm-page-title">
                {TABS.find((t) => t.key === activeTab)?.label}
              </h1>
              <p className="adm-page-sub">
                {activeTab === "overview"      && "Platform revenue and theater overview"}
                {activeTab === "subscriptions" && "Subscription revenue trends and plan analytics"}
                {activeTab === "plans"         && "Manage and configure subscription plans"}
                {activeTab === "payments"      && "Subscription transactions and owner payouts"}
                {activeTab === "theaters"      && "Manage and approve theater registrations"}
                {activeTab === "users"         && "Overview of platform owners, workers, and customers"}
              </p>
            </div>
          </div>
          <button className="adm-refresh-btn" onClick={loadTheaters}>↻ Refresh</button>
        </div>

        {error && (
          <div className="adm-error-bar">
            {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        {/* ══ TAB: OVERVIEW ══ */}
        {activeTab === "overview" && (
          <div className="adm-fade-in">
            <div className="adm-kpi-grid">
              <StatCard icon="◎" label="Total Theaters"        value={theaters.length}
                accent="blue"   sub="All registered" />
              <StatCard icon="◫" label="Active Theaters"       value={activeTheaters}
                accent="green"  sub="Approved & live" />
              <StatCard icon="👥" label="Total Users" 
                value={userStats.owners + userStats.workers + userStats.customers}
                accent="blue"  
                sub={`${userStats.owners} Owners · ${userStats.workers} Workers · ${userStats.customers} Customers`} 
              />
            </div>

            <div className="adm-overview-row">
              <div className="adm-card adm-chart-card">
                <div className="adm-card-header">
                  <div className="adm-card-title">Platform Performance</div>
                  <div className="adm-seg-btns">
                    {[
                      { key: "revenue", label: "💰 Revenue", color: "#6366f1" },
                      { key: "subs",    label: "📦 Subs",    color: "#8b5cf6" },
                      { key: "both",    label: "💠 Both",    color: "var(--text)" }
                    ].map((m) => (
                      <button key={m.key}
                        className={`adm-seg-btn ${overviewMetric === m.key ? "active" : ""}`}
                        style={overviewMetric === m.key ? { color: m.color } : {}}
                        onClick={() => setOverviewMetric(m.key)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "12px 8px 4px" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={realRevenueData.monthly}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
                      
                      {/* Left Axis: Revenue */}
                      {(overviewMetric === "revenue" || overviewMetric === "both") && (
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                      )}
                      
                      {/* Right Axis: Subscriptions */}
                      {(overviewMetric === "subs" || overviewMetric === "both") && (
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                      )}

                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={36} />

                      {/* Area: Revenue */}
                      {(overviewMetric === "revenue" || overviewMetric === "both") && (
                        <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue"
                          stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                      )}

                      {/* Area: Subscriptions */}
                      {(overviewMetric === "subs" || overviewMetric === "both") && (
                        <Area yAxisId="right" type="monotone" dataKey="subs" name="Subscriptions"
                          stroke="#8b5cf6" strokeWidth={2} fill="url(#subCntGrad)" dot={false} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="adm-card adm-quick-stats">
                <div className="adm-card-title" style={{ marginBottom: 14 }}>Revenue Breakdown</div>
                {[
                  { label: "Subscription Revenue",  value: fmt(subRevenue),                                 color: "#6366f1" },
                  { label: "Pending Sub Payments",  value: fmt(pendingTx.reduce((s, t) => s + Number(t.amount || 0), 0)),     color: "#d97706" },
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

        {/* ══ TAB: SUBSCRIPTIONS ══ */}
        {activeTab === "subscriptions" && (
          <div className="adm-fade-in">
            <div className="adm-kpi-grid">
              <StatCard icon="◈" label="Total Sub Revenue" value={fmt(subRevenue)}  accent="accent" />
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
                  <AreaChart data={realRevenueData[revenueRange]}>
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
                      stroke="#6366f1" strokeWidth={2} fill="url(#subRevGrad)" dot={false} 
                      data={realRevenueData[revenueRange]} />
                    <Area yAxisId="right" type="monotone" dataKey="subs" name="subscriptions"
                      stroke="#8b5cf6" strokeWidth={2} fill="url(#subCntGrad)" dot={false} 
                      data={realRevenueData[revenueRange]} />
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
                  <BarChart barSize={40} data={(() => {
                    const stats = {};
                    paidStatuses.forEach(s => {
                      transactions.filter(t => t.status?.toLowerCase() === s).forEach(t => {
                        const pName = t.plan || "Other";
                        stats[pName] = (stats[pName] || 0) + Number(t.amount || 0);
                      });
                    });
                    return Object.keys(stats).map(plan => ({
                      plan,
                      revenue: stats[plan],
                    }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="plan" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="revenue" radius={[6, 6, 0, 0]}>
                      {
                        /* Assign colors dynamically */
                        Object.keys(PLAN_COLOR).map((key, index) => (
                           <Cell key={`cell-${index}`} fill={PLAN_COLOR[key] || "#6366f1"} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: PLANS ══ */}
        {activeTab === "plans" && (
          <div className="adm-fade-in">
            <div className="adm-kpi-grid">
              <StatCard icon="☷" label="Total Plans" value={plans.length} accent="blue" />
            </div>

            <div className="adm-card">
              <div className="adm-card-header">
                <div className="adm-card-title">Manage Subscription Plans</div>
                <button className="adm-act-btn approve" onClick={() => openPlanModal()}>+ Create Plan</button>
              </div>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr>
                    <th>Plan Name</th><th>Price</th><th>Limit</th><th>Duration</th><th>Features</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {loadingPlans ? (
                      <tr><td colSpan="6" style={{textAlign:"center", padding: "20px"}}>Loading plans...</td></tr>
                    ) : plans.length === 0 ? (
                      <tr><td colSpan="6" style={{textAlign:"center", padding: "20px"}}>No plans found.</td></tr>
                    ) : plans.map((p) => (
                      <tr key={p._id}>
                        <td className="adm-fw">{p.name}</td>
                        <td className="adm-amount">{fmt(p.price)}</td>
                        <td>{p.theaterLimit} theater(s)</td>
                        <td>{p.duration} days</td>
                        <td className="adm-muted" style={{fontSize:"13px"}}>{p.features?.length || 0} features</td>
                        <td>
                          <button className="adm-act-btn blue" style={{marginRight: 8}} onClick={() => openPlanModal(p)}>Edit</button>
                          <button className="adm-act-btn disable" onClick={() => deletePlan(p._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {planModalOpen && (
              <div className="adm-modal-overlay">
                <div className="adm-modal">
                  <h3>{planForm._id ? "Edit Plan" : "Create Plan"}</h3>
                  <div className="adm-modal-form">
                    <label>Plan Name</label>
                    <input 
                      value={planForm.name} 
                      onChange={e => setPlanForm({...planForm, name: e.target.value})} 
                    />
                    
                    <label>Price (₹)</label>
                    <input 
                      type="number" 
                      value={planForm.price} 
                      onChange={e => setPlanForm({...planForm, price: e.target.value})} 
                    />
                    
                    <label>Theater Limit</label>
                    <input 
                      type="number" 
                      value={planForm.theaterLimit} 
                      onChange={e => setPlanForm({...planForm, theaterLimit: e.target.value})} 
                    />
                    
                    <label>Duration (days)</label>
                    <input 
                      type="number" 
                      value={planForm.duration} 
                      onChange={e => setPlanForm({...planForm, duration: e.target.value})} 
                    />
                    
                    <label>Features (One per line)</label>
                    <textarea 
                      rows="4" 
                      placeholder="e.g. Up to 4 cinema locations&#10;Unlimited worker accounts"
                      value={planForm.features} 
                      onChange={e => setPlanForm({...planForm, features: e.target.value})}
                    ></textarea>
                  </div>
                  <div className="adm-modal-actions mt-3" style={{ marginTop: '15px' }}>
                    <button className="adm-act-btn disable" onClick={() => setPlanModalOpen(false)}>Cancel</button>
                    <button className="adm-act-btn approve" style={{marginLeft: 8}} onClick={savePlan}>Save Plan</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: PAYMENTS ══ */}
        {activeTab === "payments" && (
          <div className="adm-fade-in">
            <div className="adm-kpi-grid">
              <StatCard icon="◎" label="Total Collected"  value={fmt(subRevenue)}          accent="accent" sub="From subscriptions" />
              <StatCard icon="◈" label="Pending Sub Payments" value={fmt(pendingTx.reduce((s, t) => s + t.amount, 0))} accent="amber" />
              <StatCard icon="⬡" label="Total Transactions"   value={transactions.length} accent="blue" />
            </div>

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
          </div>
        )}

        {/* ══ TAB: THEATERS ══ */}
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
                <div className="adm-theater-card-grid">
                  {filteredTheaters.map((t) => {
                    const isExpanded = expandedTheaterId === t._id;
                    const bank = bankDetailsMap[t._id];
                    return (
                      <div className="adm-theater-card" key={t._id}>
                        <div className="adm-tc-header">
                          <div className="adm-tc-title-row">
                            <h3 className="adm-tc-name">{t.name}</h3>
                            <span className={`adm-status-pill ${t.isActive ? "paid" : "pending"}`}>
                              {t.isActive ? "Active" : "Pending"}
                            </span>
                          </div>
                          <div className="adm-tc-subtitle">{t.branchName ? `${t.branchName}, ${t.city}` : (t.city || "—")}</div>
                        </div>
                        
                        <div className="adm-tc-body">
                          <div className="adm-tc-info">
                            <span className="adm-tc-icon">👤</span> 
                            <span>{t.ownerName || "No Owner specified"}</span>
                          </div>
                        </div>

                        <div className="adm-tc-actions">
                          <button className="adm-act-btn detail" onClick={() => setExpandedTheaterId(isExpanded ? null : t._id)}>
                            {isExpanded ? "Hide Details" : "View Details"}
                          </button>
                          {t.isActive ? (
                            <button className="adm-act-btn disable" disabled={actionLoading[t._id]} onClick={() => updateTheaterStatus(t._id, false)}>
                              {actionLoading[t._id] ? "..." : "Disable"}
                            </button>
                          ) : (
                            <button className="adm-act-btn approve" disabled={actionLoading[t._id]} onClick={() => updateTheaterStatus(t._id, true)}>
                              {actionLoading[t._id] ? "..." : "Approve"}
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="adm-tc-expanded">
                            <div className="adm-tc-exp-grid">
                              <div className="adm-tc-exp-col">
                                <h4>Contact Info</h4>
                                <p><strong>Email:</strong> {t.email || "—"}</p>
                                <p><strong>Phone:</strong> {t.contactNumber || "—"}</p>
                                <p><strong>Address:</strong> {t.address || "—"}</p>
                              </div>
                              <div className="adm-tc-exp-col">
                                <h4>Operations</h4>
                                <p><strong>Screens:</strong> {t.totalScreens || "—"}</p>
                                <p><strong>Timings:</strong> {formatTime(t.openingTime)} - {formatTime(t.closingTime)}</p>
                              </div>
                            </div>
                            <div className="adm-tc-exp-bank">
                              <h4>Bank Details</h4>
                              {bank ? (
                                <div className="adm-tc-bank-info">
                                  <p><strong>Bank Name:</strong> {bank.bankName || "—"}</p>
                                  <p><strong>Account Holder Name:</strong> {bank.accountHolder || "—"}</p>
                                  <p><strong>Account Number:</strong> {bank.accountNumber || "—"}</p>
                                  <p><strong>IFSC Code:</strong> {bank.ifscCode || bank.ifsc || "—"}</p>
                                  <p><strong>UPI ID:</strong> {bank.upiId || "—"}</p>
                                </div>
                              ) : (
                                <p className="adm-muted" style={{fontSize: 13}}>No bank details available.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="adm-bottom-nav">
        <div className="adm-bottom-nav-inner">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`adm-bottom-nav-btn ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <span className="bnav-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
};

export default AdminDashboard;