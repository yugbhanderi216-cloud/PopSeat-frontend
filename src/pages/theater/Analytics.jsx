import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import "./Analytics.css";

const API_BASE   = "https://popseat.onrender.com/api";
const ALL_STATUSES = ["placed", "preparing", "ready", "delivered"];

const getToken = () =>
  localStorage.getItem("ownerToken") ||
  localStorage.getItem("workerToken") ||
  localStorage.getItem("token") || "";

const getRole = () =>
  (
    localStorage.getItem("ownerRole") ||
    localStorage.getItem("workerRole") ||
    localStorage.getItem("role") || ""
  ).toLowerCase();

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const CHART_RANGES = [
  { key: "daily",   label: "Today"   },
  { key: "weekly",  label: "7 Days"  },
  { key: "monthly", label: "30 Days" },
  { key: "yearly",  label: "12 Mo."  },
];

const CHART_METRICS = [
  { key: "orders",  label: "Orders"  },
  { key: "revenue", label: "Revenue" },
  { key: "both",    label: "Both"    },
];

const STATUS_CONFIG = [
  { key: "placed",    label: "Placed",    color: "#6C63FF" },
  { key: "preparing", label: "Preparing", color: "#f59e0b" },
  { key: "ready",     label: "Ready",     color: "#0891b2" },
  { key: "delivered", label: "Delivered", color: "#16a34a" },
];

/* ── Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="chart-tooltip-row" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span>{p.name === "Revenue" ? formatCurrency(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Build time-bucketed chart data ── */
const buildChartData = (orders, range) => {
  const now = new Date();

  if (range === "daily") {
    const buckets = {};
    for (let h = 23; h >= 0; h--) {
      const d   = new Date(now); d.setHours(now.getHours() - h, 0, 0, 0);
      const key = `${d.getHours().toString().padStart(2, "0")}:00`;
      buckets[key] = { label: key, Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const d        = new Date(o.createdAt);
      const diffHrs  = (now - d) / (1000 * 60 * 60);
      if (diffHrs <= 24 && d.getDate() === now.getDate()) {
        const key = `${d.getHours().toString().padStart(2, "0")}:00`;
        if (buckets[key]) {
          buckets[key].Orders  += 1;
          buckets[key].Revenue += o.totalAmount || 0;
        }
      }
    });
    return Object.values(buckets);
  }

  if (range === "weekly" || range === "monthly") {
    const days    = range === "weekly" ? 7 : 30;
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d   = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets[key] = { label: key, Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const d        = new Date(o.createdAt);
      const diffDays = (now - d) / (1000 * 60 * 60 * 24);
      if (diffDays <= days) {
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (buckets[key]) {
          buckets[key].Orders  += 1;
          buckets[key].Revenue += o.totalAmount || 0;
        }
      }
    });
    return Object.values(buckets);
  }

  if (range === "yearly") {
    const buckets = {};
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now); d.setMonth(now.getMonth() - i);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      buckets[key] = { label: key, Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const d          = new Date(o.createdAt);
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffMonths >= 0 && diffMonths <= 11) {
        const key = d.toLocaleDateString("en-US", { month: "short" });
        if (buckets[key]) {
          buckets[key].Orders  += 1;
          buckets[key].Revenue += o.totalAmount || 0;
        }
      }
    });
    return Object.values(buckets);
  }

  return [];
};

/* ── Compute top-selling items from orders ── */
const buildTopItems = (orders) => {
  const map = {};
  orders.forEach((o) => {
    const items =
      o.items || o.cartItems || o.orderItems || o.foodItems || [];
    items.forEach((item) => {
      const name = item.name || item.itemName || item.foodName || "Unknown Item";
      const qty  = item.quantity || item.qty || 1;
      const rev  = (item.price || item.unitPrice || 0) * qty;
      if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
      map[name].qty     += qty;
      map[name].revenue += rev;
    });
  });
  return Object.values(map)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);
};

// ─────────────────────────────────────────────
//  Analytics Component
// ─────────────────────────────────────────────
const Analytics = () => {
  const location       = useLocation();
  const [searchParams] = useSearchParams();
  const role           = getRole();

  const cinemaId = useMemo(() => {
    const fromUrl   = searchParams.get("theaterId") || "";
    const fromState = location.state?.theaterId     || "";
    if (fromUrl)   return fromUrl;
    if (fromState) return fromState;
    if (role === "worker") return localStorage.getItem("assignedTheaterId") || "";
    return localStorage.getItem("activeOwnerTheaterId") || localStorage.getItem("theaterId") || "";
  }, [searchParams, location.state, role]);

  const [orders,      setOrders]      = useState([]);
  const [chartRange,  setChartRange]  = useState("weekly");
  const [chartMetric, setChartMetric] = useState("orders");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  /* ── Fetch all orders across statuses ── */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = getToken();
    if (!token) {
      setError("No auth token. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.allSettled(
        ALL_STATUSES.map((s) =>
          fetch(`${API_BASE}/worker/orders?status=${s}`, {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }).then((r) => {
            if (!r.ok) return { success: false };
            return r.json();
          })
        )
      );

      const seen = new Set(), merged = [];
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value?.success)
          (r.value.orders || []).forEach((o) => {
            if (
              !seen.has(o._id) &&
              (role === "worker" || o.cinemaId === cinemaId || o.theaterId === cinemaId || !o.cinemaId)
            ) {
              seen.add(o._id);
              merged.push(o);
            }
          });
      });

      setOrders(merged);
    } catch {
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [cinemaId, role]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const delivered = orders.filter((o) => o.orderStatus === "delivered");
    const revenue   = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const avgOrder  = delivered.length ? Math.round(revenue / delivered.length) : 0;
    const pending   = orders.filter((o) => ["placed", "preparing", "ready"].includes(o.orderStatus)).length;
    const convRate  = orders.length ? Math.round((delivered.length / orders.length) * 100) : 0;

    return {
      total:     orders.length,
      revenue,
      delivered: delivered.length,
      preparing: orders.filter((o) => o.orderStatus === "preparing").length,
      placed:    orders.filter((o) => o.orderStatus === "placed").length,
      ready:     orders.filter((o) => o.orderStatus === "ready").length,
      pending,
      avgOrder,
      convRate,
    };
  }, [orders]);

  const chartData = useMemo(() => buildChartData(orders, chartRange), [orders, chartRange]);
  const topItems  = useMemo(() => buildTopItems(orders), [orders]);

  /* ── Chart range summary numbers ── */
  const rangeSummary = useMemo(() => {
    const totals = chartData.reduce(
      (acc, d) => ({ orders: acc.orders + d.Orders, revenue: acc.revenue + d.Revenue }),
      { orders: 0, revenue: 0 }
    );
    return totals;
  }, [chartData]);

  const showOrders  = chartMetric === "orders"  || chartMetric === "both";
  const showRevenue = chartMetric === "revenue" || chartMetric === "both";

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="analytics-spinner" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">

      {/* ── TOPBAR ── */}
      <div className="analytics-topbar">
        <div className="analytics-topbar-left">
          <h2 className="analytics-title">📊 Analytics</h2>
          {orders.length > 0 && (
            <span className="analytics-badge">{orders.length} orders total</span>
          )}
        </div>
        <button className="analytics-refresh-btn" onClick={fetchOrders}>↻ Refresh</button>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="analytics-error">
          <span>⚠️ {error}</span>
          <button className="analytics-error-close" onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div className="analytics-grid">
        <div className="analytics-card accent-violet">
          <p className="card-label">Total Orders</p>
          <p className="card-value">{stats.total}</p>
          <p className="card-sub">{stats.pending} pending</p>
        </div>
        <div className="analytics-card accent-green">
          <p className="card-label">Revenue</p>
          <p className="card-value">{formatCurrency(stats.revenue)}</p>
          <p className="card-sub">from delivered orders</p>
        </div>
        <div className="analytics-card accent-blue">
          <p className="card-label">Delivered</p>
          <p className="card-value">{stats.delivered}</p>
          <p className="card-sub">{stats.convRate}% conversion</p>
        </div>
        <div className="analytics-card accent-amber">
          <p className="card-label">Avg Order Value</p>
          <p className="card-value">{formatCurrency(stats.avgOrder)}</p>
          <p className="card-sub">per delivered order</p>
        </div>
      </div>

      {/* ── CHART SECTION ── */}
      <div className="chart-section">

        {/* Chart header */}
        <div className="chart-header">
          <div className="chart-header-top">
            <h3 className="chart-title">Performance Overview</h3>
            {/* Summary line */}
            <div className="chart-summary">
              {showOrders && (
                <span className="csum-item csum-orders">
                  <span className="csum-dot" style={{ background: "#8b5cf6" }} />
                  {rangeSummary.orders} orders
                </span>
              )}
              {showOrders && showRevenue && <span className="csum-sep">·</span>}
              {showRevenue && (
                <span className="csum-item csum-revenue">
                  <span className="csum-dot" style={{ background: "#10b981" }} />
                  {formatCurrency(rangeSummary.revenue)}
                </span>
              )}
            </div>
          </div>

          {/* Controls row */}
          <div className="chart-controls">
            <div className="ctrl-group">
              <span className="ctrl-label">Show</span>
              <div className="chart-toggle-group">
                {CHART_METRICS.map((m) => (
                  <button
                    key={m.key}
                    className={`chart-toggle-btn ${chartMetric === m.key ? "active" : ""}`}
                    onClick={() => setChartMetric(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ctrl-group">
              <span className="ctrl-label">Range</span>
              <div className="chart-toggle-group">
                {CHART_RANGES.map((r) => (
                  <button
                    key={r.key}
                    className={`chart-toggle-btn ${chartRange === r.key ? "active" : ""}`}
                    onClick={() => setChartRange(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart body */}
        <div className="chart-body">
          {orders.length === 0 ? (
            <div className="chart-empty">
              <span className="chart-empty-icon">📈</span>
              <p>No data to display yet. Orders will appear here once placed.</p>
            </div>
          ) : (
            <div style={{ width: "100%", height: 280, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(108,99,255,0.07)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#ABA8CC", fontSize: 11 }}
                    dy={8}
                  />

                  {/* Always render at least one Y-axis. If both are shown, orders go left, revenue goes right. */}
                  {showOrders && (
                    <YAxis
                      yAxisId="left"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#ABA8CC", fontSize: 11 }}
                      dx={-4}
                    />
                  )}

                  {showRevenue && (
                    <YAxis
                      yAxisId={showOrders ? "right" : "left"}
                      orientation={showOrders ? "right" : "left"}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#ABA8CC", fontSize: 11 }}
                      dx={showOrders ? 4 : -4}
                      tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                    />
                  )}

                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={32} wrapperStyle={{ paddingBottom: 12 }} />

                  {showOrders && (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="Orders"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  )}

                  {showRevenue && (
                    <Area
                      yAxisId={showOrders ? "right" : "left"}
                      type="monotone"
                      dataKey="Revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  )}

                  {/* Fallback: if neither axis was rendered (shouldn't happen), render a hidden left axis */}
                  {!showOrders && !showRevenue && (
                    <YAxis yAxisId="left" hide />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW: Status Distribution + Top Items ── */}
      <div className="analytics-bottom-row">

        {/* Order Status Distribution */}
        <div className="status-section">
          <h3 className="section-title">📦 Order Status</h3>
          {orders.length === 0 ? (
            <p className="analytics-empty">No orders yet.</p>
          ) : (
            STATUS_CONFIG.map(({ key, label, color }) => {
              const count = orders.filter((o) => o.orderStatus === key).length;
              const pct   = orders.length > 0 ? (count / orders.length) * 100 : 0;
              return (
                <div key={key} className="status-bar-row">
                  <div className="status-bar-meta">
                    <span className="status-bar-label">
                      <span className="status-dot" style={{ background: color }} />
                      {label}
                    </span>
                    <span className="status-bar-count">
                      {count}
                      <span className="status-pct"> ({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="status-bar-track">
                    <div
                      className="status-bar-fill"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Top Selling Items */}
        <div className="top-items">
          <h3 className="section-title">🔥 Top Selling Items</h3>

          {topItems.length === 0 ? (
            <div className="top-items-empty">
              <span>🍽️</span>
              <p>
                {orders.length === 0
                  ? "No orders yet."
                  : "Order items data not available from server."}
              </p>
            </div>
          ) : (
            <>
              {topItems.map((item, idx) => {
                const maxQty = topItems[0].qty;
                const barPct = maxQty > 0 ? (item.qty / maxQty) * 100 : 0;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={item.name} className="top-item">
                    <div className="top-item-left">
                      <div className="top-item-name">
                        <span className="top-item-rank">
                          {idx < 3 ? medals[idx] : `#${idx + 1}`}
                        </span>
                        {item.name}
                      </div>
                      <div className="top-item-bar-track">
                        <div
                          className="top-item-bar-fill"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="top-item-stats">
                      <span className="top-item-qty">{item.qty} sold</span>
                      {item.revenue > 0 && (
                        <span className="top-item-rev">{formatCurrency(item.revenue)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default Analytics;