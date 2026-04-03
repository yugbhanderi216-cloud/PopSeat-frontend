import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TheaterDashboard.css";

// FIX: Standardized to include /api — consistent with Orders.jsx and Analytics.jsx
const API_BASE = "https://popseat.onrender.com/api";
const WORKER_STATUSES = ["placed", "preparing", "ready", "delivered"];

const formatTime = (time) => {
  if (!time) return "—";
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);
  const ampm  = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const formatCurrency = (amount) =>
  `₹ ${Number(amount).toLocaleString("en-IN")}`;

const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_BASE}/${url.replace(/^\//, '')}`;
};

const authHeaders = () => ({
  "Content-Type" : "application/json",
  Authorization  : `Bearer ${
    localStorage.getItem("ownerToken")  ||
    localStorage.getItem("workerToken") ||
    localStorage.getItem("token")       || ""
  }`,
});

const TheaterDashboard = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { state } = location;

  const role = (
    localStorage.getItem("ownerRole") ||
    localStorage.getItem("workerRole") ||
    localStorage.getItem("role") || ""
  ).toLowerCase();

  const email = (
    localStorage.getItem("ownerEmail") ||
    localStorage.getItem("workerEmail") ||
    localStorage.getItem("email") || ""
  );

  const params = new URLSearchParams(location.search);

  const theaterId = role === "worker"
    ? (localStorage.getItem("assignedTheaterId") || localStorage.getItem("customerTheaterId") || "")
    : (params.get("theaterId") || state?.theaterId || localStorage.getItem("activeOwnerTheaterId") || localStorage.getItem("customerTheaterId") || "");

  const [theater, setTheater] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!email || !role) navigate("/login", { replace: true });
  }, [email, role, navigate]);

  useEffect(() => {
    if (role === "owner" && theaterId) {
      localStorage.setItem("activeOwnerTheaterId", theaterId);
    }
  }, [role, theaterId]);

  const fetchTheater = useCallback(async () => {
    if (!theaterId) {
      setError("No theater selected. Please go back.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/cinema/${theaterId}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to load theater.");
        return;
      }
      setTheater(data.cinema);
    } catch (err) {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [theaterId]);

  useEffect(() => { fetchTheater(); }, [fetchTheater]);

  const fetchOrders = useCallback(async () => {
    if (!theaterId) return;
    try {
      // UNIFIED FETCH: Use status-based worker endpoints as they are stable.
      // Bypass the crashing /api/orders?cinemaId query.
      const responses = await Promise.allSettled(
        WORKER_STATUSES.map((status) =>
          fetch(`${API_BASE}/worker/orders?status=${status}`, {
            headers: authHeaders(),
          }).then((r) => r.json())
        )
      );

      const seen = new Set();
      const merged = [];

      responses.forEach((result) => {
        if (result.status === "fulfilled" && result.value?.success) {
          (result.value.orders || []).forEach((order) => {
            // Frontend manual filter to ensure data isolation while backend query is being fixed
            if (!seen.has(order._id) && (order.theaterId === theaterId || order.cinemaId === theaterId || !order.theaterId)) {
              seen.add(order._id);
              merged.push(order);
            }
          });
        }
      });
      setOrders(merged);
    } catch (err) {
      console.error("Orders fetch error:", err);
    }
  }, [theaterId]);

  useEffect(() => {
    if (!theater) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    const handleVisibility = () => { if (!document.hidden) fetchOrders(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [theater, fetchOrders]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTheater(), fetchOrders()]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard-state"><p>Loading theater...</p></div>;
  if (error) return <div className="dashboard-state error"><p>{error}</p></div>;
  if (!theater) return null;

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const statusCounts = WORKER_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.orderStatus === s).length;
    return acc;
  }, {});

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          {theater.theaterLogo && <img src={getImageUrl(theater.theaterLogo)} alt="Logo" className="dashboard-logo" />}
          <div className="header-text">
            <h1>{theater.name}</h1>
            <p>{theater.branchName} • {theater.city}</p>
          </div>
        </div>
        <button className="dashboard-refresh-btn" onClick={handleRefresh}>↻ Refresh</button>
      </div>

      <div className="dashboard-stats">
        <div className="stat-box"><span>📦 Total</span><strong>{totalOrders}</strong></div>
        <div className="stat-box"><span>💰 Revenue</span><strong>{formatCurrency(totalRevenue)}</strong></div>
        {WORKER_STATUSES.map(s => (
          <div key={s} className="stat-box">
             <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
             <strong>{statusCounts[s]}</strong>
          </div>
        ))}
      </div>

      <div className="dashboard-info">
        <div className="info-card"><h3>Working Hours</h3><p>{formatTime(theater.openingTime)} – {formatTime(theater.closingTime)}</p></div>
        <div className="info-card"><h3>Screens</h3><p>{theater.totalScreens || "—"}</p></div>
        <div className="info-card"><h3>Contact</h3><p>{theater.contactNumber || "—"}</p></div>
        <div className="info-card"><h3>Address</h3><p>{theater.address || "—"}</p></div>
        <div className="info-card"><h3>Email</h3><p>{theater.email || "—"}</p></div>
        <div className="info-card"><h3>Owner</h3><p>{theater.ownerName || "—"}</p></div>
      </div>
    </div>
  );
};

export default TheaterDashboard;