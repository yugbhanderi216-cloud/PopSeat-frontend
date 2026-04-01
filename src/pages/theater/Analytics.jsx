import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import "./Analytics.css";

const API_BASE     = "https://popseat.onrender.com/api";
const ALL_STATUSES = ["placed", "preparing", "ready", "delivered"];

const getToken = () =>
  localStorage.getItem("ownerToken")  ||
  localStorage.getItem("workerToken") ||
  localStorage.getItem("token")       || "";

const getRole = () =>
  (
    localStorage.getItem("ownerRole")  ||
    localStorage.getItem("workerRole") ||
    localStorage.getItem("role")       || ""
  ).toLowerCase();

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const STAT_FILTERS = [
  { key: "today", label: "Today"   },
  { key: "week",  label: "Weekly"  },
  { key: "month", label: "Monthly" },
  { key: "year",  label: "Yearly"  },
];

const CHART_RANGES = [
  { key: "daily",   label: "Daily"   },
  { key: "weekly",  label: "Weekly"  },
  { key: "monthly", label: "Monthly" },
  { key: "yearly",  label: "Yearly"  },
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
      const d   = new Date(now);
      d.setHours(now.getHours() - h, 0, 0, 0);
      const hr  = d.getHours();
      const key = `${hr.toString().padStart(2, "0")}:00`;
      buckets[key] = { label: hr % 3 === 0 ? key : "", fullLabel: key, Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const d    = new Date(o.createdAt);
      const diff = (now - d) / (1000 * 60 * 60);
      if (diff <= 24) {
        const key = `${d.getHours().toString().padStart(2, "0")}:00`;
        if (buckets[key]) {
          buckets[key].Orders += 1;
          if (o.orderStatus === "delivered") buckets[key].Revenue += o.totalAmount || 0;
        }
      }
    });
    return Object.values(buckets);
  }

  if (range === "weekly") {
    const buckets = {};
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
      buckets[key] = { label: key, Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const d    = new Date(o.createdAt);
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      if (diff <= 7) {
        const key = `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
        if (buckets[key]) {
          buckets[key].Orders += 1;
          if (o.orderStatus === "delivered") buckets[key].Revenue += o.totalAmount || 0;
        }
      }
    });
    return Object.values(buckets);
  }

  if (range === "monthly") {
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const buckets = MONTHS.map((m) => ({ label: m, Orders: 0, Revenue: 0 }));
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (d.getFullYear() === now.getFullYear()) {
        buckets[d.getMonth()].Orders += 1;
        if (o.orderStatus === "delivered") buckets[d.getMonth()].Revenue += o.totalAmount || 0;
      }
    });
    return buckets;
  }

  if (range === "yearly") {
    const buckets = {};
    for (let y = now.getFullYear() - 4; y <= now.getFullYear(); y++) {
      buckets[y] = { label: String(y), Orders: 0, Revenue: 0 };
    }
    orders.forEach((o) => {
      const y = new Date(o.createdAt).getFullYear();
      if (buckets[y]) {
        buckets[y].Orders += 1;
        if (o.orderStatus === "delivered") buckets[y].Revenue += o.totalAmount || 0;
      }
    });
    return Object.values(buckets);
  }

  return [];
};

const yFmt = (v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : String(v));

const Analytics = () => {
  const location       = useLocation();
  const [searchParams] = useSearchParams();
  const role = getRole();

  const cinemaId = useMemo(() => {
    const fromUrl   = searchParams.get("theaterId") || "";
    const fromState = location.state?.theaterId     || "";

    if (fromUrl)   return fromUrl;
    if (fromState) return fromState;

    if (role === "worker") {
      return localStorage.getItem("assignedTheaterId") || "";
    }

    return (
      localStorage.getItem("currentTheaterId")     ||
      localStorage.getItem("activeOwnerTheaterId") ||
      localStorage.getItem("theaterId")            || ""
    );
  }, [searchParams, location.state, role]);

  const [orders,      setOrders]      = useState([]);
  const [filter,      setFilter]      = useState("today");
  const [chartRange,  setChartRange]  = useState("weekly");
  const [chartType,   setChartType]   = useState("area");
  const [chartMetric, setChartMetric] = useState("both");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = getToken();

    try {
      if (role === "owner") {
        if (!cinemaId) {
          setError("Theater ID not found. Please open analytics from the theater dashboard.");
          setLoading(false);
          return;
        }

        const res  = await fetch(`${API_BASE}/orders?cinemaId=${cinemaId}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.success) {
          setOrders(data.orders || []);
          if (!(data.orders || []).length)
            setError("No orders found. Data will appear once orders are placed.");
        } else {
          setError(data.message || "Failed to load orders.");
        }

      } else {
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
              if (!seen.has(o._id)) { seen.add(o._id); merged.push(o); }
            });
        });

        const scoped = cinemaId
          ? merged.filter((o) => o.cinemaId === cinemaId || o.cinemaId?._id === cinemaId)
          : merged;

        setOrders(scoped);
        if (!scoped.length) setError("No orders found for this period.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [cinemaId, role]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const now = new Date();
  const filteredOrders = useMemo(() => orders.filter((o) => {
    const d = new Date(o.createdAt);
    if (filter === "today") return d.toDateString() === now.toDateString();
    if (filter === "week")  return d >= new Date(now - 7 * 86400000);
    if (filter === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filter === "year")  return d.getFullYear() === now.getFullYear();
    return true;
  }), [orders, filter]);

  const totalOrders  = filteredOrders.length;
  const delivered    = filteredOrders.filter((o) => o.orderStatus === "delivered").length;
  const totalRevenue = filteredOrders.filter((o) => o.orderStatus === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0);
  const placed       = filteredOrders.filter((o) => o.orderStatus === "placed").length;
  const preparing    = filteredOrders.filter((o) => o.orderStatus === "preparing").length;
  const ready        = filteredOrders.filter((o) => o.orderStatus === "ready").length;

  const chartData    = useMemo(() => buildChartData(orders, chartRange), [orders, chartRange]);
  const chartOrders  = useMemo(() => chartData.reduce((s, d) => s + d.Orders,  0), [chartData]);
  const chartRevenue = useMemo(() => chartData.reduce((s, d) => s + d.Revenue, 0), [chartData]);
  const isEmpty      = chartData.every((d) => d.Orders === 0 && d.Revenue === 0);

  const topItems = useMemo(() => {
    const map = {};
    filteredOrders.forEach((o) => {
      if (Array.isArray(o.items))
        o.items.forEach((item) => {
          if (item?.name) map[item.name] = (map[item.name] || 0) + (item.quantity || 1);
        });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredOrders]);

  const STAT_CARDS = [
    { label: "Total Orders",        value: totalOrders,              accent: "violet" },
    { label: "Revenue (Delivered)", value: formatCurrency(totalRevenue), accent: "green"  },
    { label: "Placed",              value: placed,                   accent: "violet" },
    { label: "Preparing",           value: preparing,                accent: "amber"  },
    { label: "Ready",               value: ready,                    accent: "blue"   },
    { label: "Delivered",           value: delivered,                accent: "green"  },
  ];

  const axisStyle = {
    tick: { fontSize: 11, fontFamily: "Plus Jakarta Sans", fill: "#ABA8CC", fontWeight: 600 },
    axisLine: false,
    tickLine: false,
  };

  if (loading) return (
    <div className="analytics-container">
      <div className="analytics-topbar">
        <h2 className="analytics-title">📊 Theater Analytics</h2>
      </div>
      <div className="analytics-loading">
        <div className="analytics-spinner" />
        <p>Loading analytics...</p>
      </div>
    </div>
  );

  return (
    <div className="analytics-container">
      <div className="analytics-topbar">
        <h2 className="analytics-title">📈 Theater Analytics</h2>
        <button className="analytics-refresh-btn" onClick={fetchOrders}>↻ Refresh</button>
      </div>

      {error && <p className="analytics-info">{error}</p>}

      <div className="filter-buttons">
        {STAT_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            className={`filter-btn ${filter === key ? "active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="analytics-grid">
        {STAT_CARDS.map(({ label, value, accent }) => (
          <div key={label} className={`analytics-card accent-${accent}`}>
            <h3 className="card-label">{label}</h3>
            <p className="card-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <div className="chart-header-top">
            <div>
              <h3 className="chart-title">Trends & Volume</h3>
              <div className="chart-summary">
                <span className="csum-item csum-orders">
                  <span className="csum-dot" style={{ background: "#6C63FF" }} />
                  {chartOrders} orders
                </span>
                <span className="csum-sep">·</span>
                <span className="csum-item csum-revenue">
                  <span className="csum-dot" style={{ background: "#22C55E" }} />
                  {formatCurrency(chartRevenue)} revenue
                </span>
              </div>
            </div>
          </div>

          <div className="chart-controls">
            <div className="ctrl-group">
              <span className="ctrl-label">Period</span>
              <div className="chart-toggle-group">
                {CHART_RANGES.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`chart-toggle-btn ${chartRange === key ? "active" : ""}`}
                    onClick={() => setChartRange(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ctrl-group">
              <span className="ctrl-label">Metric</span>
              <div className="chart-toggle-group">
                {[
                  { key: "both",    label: "Both"    },
                  { key: "orders",  label: "Orders"  },
                  { key: "revenue", label: "Revenue" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className={`chart-toggle-btn ${chartMetric === key ? "active" : ""}`}
                    onClick={() => setChartMetric(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="chart-body">
          {isEmpty ? (
            <div className="chart-empty">
              <span className="chart-empty-icon">📈</span>
              <p>No data for this range.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6C63FF" stopOpacity={0.20} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,99,255,0.07)" />
                <XAxis dataKey="label" {...axisStyle} />
                <YAxis yAxisId="o" {...axisStyle} width={28} />
                {(chartMetric === "both" || chartMetric === "revenue") && (
                  <YAxis yAxisId="r" orientation="right" tickFormatter={yFmt} {...axisStyle} width={44} />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: "Plus Jakarta Sans", fontSize: 12, fontWeight: 600, paddingTop: 10 }} />
                {(chartMetric === "both" || chartMetric === "orders") && (
                  <Area yAxisId="o" type="monotone" dataKey="Orders"
                    stroke="#6C63FF" strokeWidth={3} fill="url(#gOrders)"
                    dot={false} activeDot={{ r: 6, fill: "#6C63FF", stroke: "#fff", strokeWidth: 2 }} />
                )}
                {(chartMetric === "both" || chartMetric === "revenue") && (
                  <Area yAxisId="r" type="monotone" dataKey="Revenue"
                    stroke="#22C55E" strokeWidth={3} fill="url(#gRevenue)"
                    dot={false} activeDot={{ r: 6, fill: "#22C55E", stroke: "#fff", strokeWidth: 2 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="top-items">
        <h3 className="section-title">🔥 Top Selling Items</h3>
        {topItems.length === 0 ? (
          <p className="analytics-empty">No item data for this period.</p>
        ) : (
          <div className="top-items-list">
            {topItems.map(([name, qty], i) => (
              <div key={name} className="top-item">
                <span className="top-item-name">
                  <span className="top-item-rank">#{i + 1}</span>
                  {name}
                </span>
                <span className="top-item-qty">{qty} sold</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;