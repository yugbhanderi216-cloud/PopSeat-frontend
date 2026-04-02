import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
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

const buildChartData = (orders) => {
  const map = {};

  orders.forEach((o) => {
    const date = new Date(o.createdAt).toLocaleDateString();

    if (!map[date]) {
      map[date] = {
        label: date,
        Orders: 0,
        Revenue: 0,
      };
    }

    map[date].Orders += 1;

    if (o.orderStatus === "delivered") {
      map[date].Revenue += o.totalAmount || 0;
    }
  });

  return Object.values(map);
};

const Analytics = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const role = getRole();

  const cinemaId = useMemo(() => {
    const fromUrl = searchParams.get("theaterId") || "";
    const fromState = location.state?.theaterId || "";
    if (fromUrl) return fromUrl;
    if (fromState) return fromState;
    if (role === "worker") return localStorage.getItem("assignedTheaterId") || "";
    return localStorage.getItem("activeOwnerTheaterId") || localStorage.getItem("theaterId") || "";
  }, [searchParams, location.state, role]);

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("today");
  const [chartRange, setChartRange] = useState("weekly");
  const [chartMetric, setChartMetric] = useState("both");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    const token = getToken();

    try {
      // UNIFIED FETCH: Fetch by status as it's the only stable backend path currently
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
            // Frontend filter: bypass for workers (since assignedTheaterId is missing), enforce for owners
            if (!seen.has(o._id) && (role === "worker" || o.cinemaId === cinemaId || o.theaterId === cinemaId || !o.cinemaId)) {
              seen.add(o._id); merged.push(o);
            }
          });
      });

      setOrders(merged);
      if (!merged.length) setError("No orders found for this theater.");
    } catch (err) {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [cinemaId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Rest of the logic remains same — I'll ensure the Recharts blocks are correct
  const now = new Date();
  const filteredOrders = useMemo(() => orders.filter((o) => {
    const d = new Date(o.createdAt);
    if (filter === "today") return d.toDateString() === now.toDateString();
    if (filter === "week") return d >= new Date(now - 7 * 86400000);
    return true;
  }), [orders, filter]);

  const stats = {
    total: filteredOrders.length,
    revenue: filteredOrders.filter(o => o.orderStatus === "delivered").reduce((s, o) => s + (o.totalAmount || 0), 0),
    delivered: filteredOrders.filter(o => o.orderStatus === "delivered").length,
  };

  return (
    <div className="analytics-container">
      <div className="analytics-topbar">
        <h2 className="analytics-title">📊 Analytics</h2>
        <button className="analytics-refresh-btn" onClick={fetchOrders}>Refresh</button>
      </div>

      {error && <p className="analytics-info">{error}</p>}

      <div className="analytics-grid">
        <div className="analytics-card accent-violet"><h3>Total Orders</h3><p>{stats.total}</p></div>
        <div className="analytics-card accent-green"><h3>Revenue</h3><p>{formatCurrency(stats.revenue)}</p></div>
        <div className="analytics-card accent-blue"><h3>Delivered</h3><p>{stats.delivered}</p></div>
      </div>

      <div className="chart-section" style={{ height: "400px", marginTop: "30px" }}>
        <h3 style={{ marginBottom: "20px", color: "#333", fontSize: "1.1rem" }}>Performance Overview</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={buildChartData(filteredOrders)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{fill: '#888', fontSize: 12}} dx={-10} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{fill: '#888', fontSize: 12}} dx={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: "20px" }}/>
            <Area yAxisId="left" type="monotone" dataKey="Orders" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
            <Area yAxisId="right" type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;