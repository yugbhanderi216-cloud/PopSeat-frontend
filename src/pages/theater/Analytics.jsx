import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import "./Analytics.css";

const API_BASE = "https://popseat.onrender.com/api";
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
  { key: "daily",   label: "Daily"   },
  { key: "weekly",  label: "Weekly"  },
  { key: "monthly", label: "Monthly" },
  { key: "yearly",  label: "Yearly"  },
];

// Orders tab | Revenue tab | Both tab
const CHART_METRICS = [
  { key: "orders",  label: "Orders"  },
  { key: "revenue", label: "Revenue" },
  { key: "both",    label: "Both"    },
];

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

const buildChartData = (orders, range) => {
  const now = new Date();

  if (range === "daily") {
    const buckets = {};
    for (let h = 23; h >= 0; h--) {
      const d = new Date(now); d.setHours(now.getHours() - h, 0, 0, 0);
      const hr = d.getHours();
      const key = `${hr.toString().padStart(2, "0")}:00`;
      buckets[key] = { label: key, Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const diffHours = (now - d) / (1000 * 60 * 60);
      if (diffHours <= 24 && d.getDate() === now.getDate()) {
        const key = `${d.getHours().toString().padStart(2, "00")}:00`;
        if (buckets[key]) {
          buckets[key].Orders += 1;
          if (o.orderStatus === "delivered") buckets[key].Revenue += o.totalAmount || 0;
        }
      }
    });
    return Object.values(buckets);
  }

  if (range === "weekly" || range === "monthly") {
    const buckets = {};
    const days = range === "weekly" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets[key] = { label: key, Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const diffDays = (now - d) / (1000 * 60 * 60 * 24);
      if (diffDays <= days) {
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (buckets[key]) {
          buckets[key].Orders += 1;
          if (o.orderStatus === "delivered") buckets[key].Revenue += o.totalAmount || 0;
        }
      }
    });
    return Object.values(buckets);
  }

  if (range === "yearly") {
    const buckets = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      buckets[key] = { label: key, Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      const diffMonths =
        (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffMonths >= 0 && diffMonths <= 11) {
        const key = d.toLocaleDateString("en-US", { month: "short" });
        if (buckets[key]) {
          buckets[key].Orders += 1;
          if (o.orderStatus === "delivered") buckets[key].Revenue += o.totalAmount || 0;
        }
      }
    });
    return Object.values(buckets);
  }

  return [];
};

const Analytics = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const role = getRole();

  const cinemaId = useMemo(() => {
    const fromUrl   = searchParams.get("theaterId") || "";
    const fromState = location.state?.theaterId || "";
    if (fromUrl)   return fromUrl;
    if (fromState) return fromState;
    if (role === "worker") return localStorage.getItem("assignedTheaterId") || "";
    return localStorage.getItem("activeOwnerTheaterId") || localStorage.getItem("theaterId") || "";
  }, [searchParams, location.state, role]);

  const [orders,      setOrders]      = useState([]);
  const [chartRange,  setChartRange]  = useState("weekly");
  const [chartMetric, setChartMetric] = useState("orders"); // "orders" | "revenue" | "both"
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = getToken();

    try {
      const results = await Promise.allSettled(
        ALL_STATUSES.map((s) =>
          fetch(`${API_BASE}/worker/orders?status=${s}`, {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }).then((r) => r.json())
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
      if (!merged.length) setError("No orders found for this theater yet.");
    } catch {
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }, [cinemaId, role]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const now = new Date();

  const stats = useMemo(() => ({
    total:     orders.length,
    revenue:   orders.filter(o => o.orderStatus === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0),
    delivered: orders.filter(o => o.orderStatus === "delivered").length,
    preparing: orders.filter(o => o.orderStatus === "preparing").length,
    placed:    orders.filter(o => o.orderStatus === "placed").length,
  }), [orders]);

  const chartData = useMemo(() => buildChartData(orders, chartRange), [orders, chartRange]);

  /* ── Which areas to render based on chartMetric ── */
  const showOrders  = chartMetric === "orders"  || chartMetric === "both";
  const showRevenue = chartMetric === "revenue" || chartMetric === "both";

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
        <h2 className="analytics-title">📊 Analytics</h2>
        <button className="analytics-refresh-btn" onClick={fetchOrders}>↻ Refresh</button>
      </div>

      {error && <p className="analytics-info">{error}</p>}

      {/* ── STAT CARDS ── */}
      <div className="analytics-grid">
        <div className="analytics-card accent-violet">
          <p className="card-label">Total Orders</p>
          <p className="card-value">{stats.total}</p>
        </div>
        <div className="analytics-card accent-green">
          <p className="card-label">Revenue</p>
          <p className="card-value">{formatCurrency(stats.revenue)}</p>
        </div>
        <div className="analytics-card accent-blue">
          <p className="card-label">Delivered</p>
          <p className="card-value">{stats.delivered}</p>
        </div>
        <div className="analytics-card accent-amber">
          <p className="card-label">Preparing</p>
          <p className="card-value">{stats.preparing}</p>
        </div>
      </div>

      {/* ── CHART SECTION ── */}
      <div className="chart-section">

        {/* Chart header */}
        <div className="chart-header">
          <div className="chart-header-top">
            <h3 className="chart-title">Performance Overview</h3>
          </div>

          {/* Controls row: metric tabs + range tabs */}
          <div className="chart-controls">

            {/* Metric toggle: Orders | Revenue | Both */}
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

            {/* Range toggle: Daily | Weekly | Monthly | Yearly */}
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

        {/* Chart body — explicit pixel height fixes the -1 width/height Recharts bug */}
        <div className="chart-body">
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
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

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#888", fontSize: 11 }}
                  dy={8}
                />

                {/* Left Y-axis for Orders */}
                {showOrders && (
                  <YAxis
                    yAxisId="left"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#888", fontSize: 11 }}
                    dx={-4}
                  />
                )}

                {/* Right Y-axis for Revenue */}
                {showRevenue && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#888", fontSize: 11 }}
                    dx={4}
                    tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                  />
                )}

                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={32}
                  wrapperStyle={{ paddingBottom: 12 }}
                />

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

              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;