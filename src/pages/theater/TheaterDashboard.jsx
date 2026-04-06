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
  const [isPrimary, setIsPrimary] = useState(false);
  const [theaterList, setTheaterList] = useState([]);

  useEffect(() => {
    if (!email || !role) navigate("/login", { replace: true });
  }, [email, role, navigate]);

  useEffect(() => {
    if (role === "owner" && theaterId) {
      localStorage.setItem("activeOwnerTheaterId", theaterId);
    }
  }, [role, theaterId]);

  /* ── 📝 SMART ISOLATION: Fetch owner's theaters to identify the primary one ── */
  useEffect(() => {
    if (role !== "owner" || !theaterId) return;
    const checkPrimaryStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/cinema`, { headers: authHeaders() });
        const data = await res.json();
        const list = data.cinemas || data.data || [];
        if (data.success && Array.isArray(list) && list.length > 0) {
          setTheaterList(list);
          // Rule: Stable Primary = smallest _id string (usually oldest)
          const sorted = [...list].sort((a, b) => a._id.localeCompare(b._id));
          const primaryId = sorted[0]._id;
          const status = theaterId === primaryId;
          console.log("[Smart Isolation] theaterId:", theaterId, "primaryId:", primaryId, "isPrimary:", status);
          setIsPrimary(status);
        }
      } catch (err) {
        console.warn("Smart Isolation: Could not fetch owner list.", err);
      }
    };
    checkPrimaryStatus();
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
        // ✅ CORRECTION: result.value might contain orders even if success is undefined
        if (result.status === "fulfilled" && (result.value?.orders || Array.isArray(result.value))) {
          const ordersArr = result.value?.orders || (Array.isArray(result.value) ? result.value : []);
          ordersArr.forEach((order) => {
            /* ═══════════════════════════════════════════════════════
               📝 SMARTER ISOLATION FILTER
               - Primary Theater: Owns its ID + all 'Unknown/Legacy' data.
               - Regular Theater: Owns ONLY its ID.
            ═══════════════════════════════════════════════════════ */
            const matchesId = (order.theaterId === theaterId || order.cinemaId === theaterId);
            
            // Is this order tied to a theater that IS NOT in our current account's theater list?
            // If it's unknown/legacy, and we are the Primary theater, we show it.
            const isKnownTheater = theaterList.some(t => (t._id === order.theaterId || t._id === order.cinemaId));
            const isLegacy = !isKnownTheater;

            const shouldInclude = matchesId || (isPrimary && isLegacy);

            if (!seen.has(order._id) && shouldInclude) {
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
  }, [theaterId, isPrimary, theaterList]);

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
    <div className="theater-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          {theater?.image && (
            <img src={getImageUrl(theater.image)} alt="Theater" className="theater-thumb" />
          )}
          <div className="theater-titles">
            <h1 className="theater-name">{theater?.name || "Loading..."}</h1>
            <p className="theater-location">
              {theater?.location} • {theater?.city}
            </p>
          </div>
        </div>

        <div className="dashboard-header-right">
          <button className="orders-refresh-btn" onClick={() => { setLoading(true); fetchOrders(); }}>
            ↻ Refresh
          </button>
        </div>
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