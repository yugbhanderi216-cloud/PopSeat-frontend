import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TheaterDashboard.css";

// APIs USED:
//   GET /api/cinema/:id              ✅ confirmed
//   GET /api/orders?cinemaId=:id     ✅ confirmed
//   GET /api/worker/orders?status=   ✅ confirmed (worker path)

const API_BASE = "https://popseat.onrender.com";

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
  if (url.startsWith("http") || url.startsWith("data:")) return url;
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

  const role  = (
    localStorage.getItem("ownerRole")  ||
    localStorage.getItem("workerRole") ||
    localStorage.getItem("role")       || ""
  ).toLowerCase();

  const email = (
    localStorage.getItem("ownerEmail")  ||
    localStorage.getItem("workerEmail") ||
    localStorage.getItem("email")       || ""
  );

  const params = new URLSearchParams(location.search);

  const theaterId = role === "worker"
    ? (
        localStorage.getItem("assignedTheaterId") ||
        localStorage.getItem("customerTheaterId") || ""
      )
    : (
        params.get("theaterId")                      ||
        state?.theaterId                             ||
        localStorage.getItem("activeOwnerTheaterId") ||
        localStorage.getItem("customerTheaterId")    || ""
      );

  const [theater, setTheater] = useState(null);
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  /* ── Auth guard ── */

  useEffect(() => {
    if (!email || !role) navigate("/login", { replace: true });
  }, [email, role, navigate]);

  /* ── Persist theaterId for owner page refresh ── */

  useEffect(() => {
    if (role === "owner" && theaterId) {
      localStorage.setItem("activeOwnerTheaterId", theaterId);
    }
  }, [role, theaterId]);

  /* ===============================
     FETCH THEATER — GET /api/cinema/:id ✅
     Confirmed response:
     { success, cinema: { _id, name, branchName, city,
       ownerName, totalScreens, openingTime, closingTime,
       contactNumber, address, email, isActive,
       banner, theaterLogo } }
     FIX: was GET /api/cinema (all) then filter by _id
  =============================== */

  const fetchTheater = useCallback(async () => {

    if (!theaterId) {
      setError("No theater selected. Please go back and choose one.");
      setLoading(false);
      return;
    }

    try {

      const res  = await fetch(`${API_BASE}/api/cinema/${theaterId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to load theater.");
        return;
      }

      setTheater(data.cinema);
      setError(null);

    } catch (err) {
      console.error("Theater fetch error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }

  }, [theaterId]);

  useEffect(() => {
    fetchTheater();
  }, [fetchTheater]);

  /* ===============================
     FETCH ORDERS
     Owner:  GET /api/orders?cinemaId= ✅ confirmed
             Response: { success, orders: [] }
     Worker: GET /api/worker/orders?status= ✅ (all statuses in parallel)
  =============================== */

  const fetchOrders = useCallback(async () => {

    if (!theaterId) return;

    try {

      if (role === "owner") {

        // GET /api/orders?cinemaId= ✅
        const res  = await fetch(
          `${API_BASE}/api/orders?cinemaId=${theaterId}`,
          { headers: authHeaders() }
        );
        const data = await res.json();

        if (data.success) {
          setOrders(data.orders || []);
        }

      } else {

        // Worker: fetch all statuses in parallel
        const responses = await Promise.allSettled(
          WORKER_STATUSES.map((status) =>
            fetch(`${API_BASE}/api/worker/orders?status=${status}`, {
              headers: authHeaders(),
            }).then((r) => r.json())
          )
        );

        const seen   = new Set();
        const merged = [];

        responses.forEach((result) => {
          if (result.status === "fulfilled" && result.value?.success) {
            (result.value.orders || []).forEach((order) => {
              if (!seen.has(order._id)) {
                seen.add(order._id);
                merged.push(order);
              }
            });
          }
        });

        setOrders(merged);

      }

    } catch (err) {
      console.error("Orders fetch error:", err);
    }

  }, [theaterId, role]);

  /* ── Start polling once theater loaded ── */

  useEffect(() => {

    if (!theater) return;

    fetchOrders();

    const interval = setInterval(fetchOrders, 5000);

    const handleVisibility = () => {
      if (!document.hidden) fetchOrders();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };

  }, [theater, fetchOrders]);

  /* ── Loading / error states ── */

  if (loading) {
    return (
      <div className="dashboard-state">
        <div className="state-icon">🎬</div>
        <p>Loading theater...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-state error">
        <div className="state-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    );
  }

  if (!theater) return null;

  /* ── Order stats — revenue only from delivered ── */

  const totalOrders    = orders.length;
  const totalRevenue   = orders
    .filter((o) => o.orderStatus === "delivered")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const placedCount    = orders.filter((o) => o.orderStatus === "placed").length;
  const preparingCount = orders.filter((o) => o.orderStatus === "preparing").length;
  const readyCount     = orders.filter((o) => o.orderStatus === "ready").length;
  const deliveredCount = orders.filter((o) => o.orderStatus === "delivered").length;

  return (

    <div className="dashboard-container">

      {/* BANNER */}
      <div
        className="dashboard-banner"
        style={{
          backgroundImage: theater.banner
            ? `url(${getImageUrl(theater.banner)})`
            : "linear-gradient(135deg,#6C63FF,#4338CA,#312E81)",
        }}
      >
        <div className="banner-overlay">
          {theater.theaterLogo ? (
            <img
              src={getImageUrl(theater.theaterLogo)}
              alt="Theater Logo"
              className="dashboard-logo"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling && (e.target.nextSibling.style.display = "flex");
              }}
            />
          ) : null}
          <div
            className="dashboard-logo"
            style={{
              display: theater.theaterLogo ? "none" : "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 36, background: "rgba(255,255,255,0.15)",
              borderRadius: "50%", width: 80, height: 80,
            }}
          >
            🎬
          </div>
          <h1>{theater.name}</h1>
          <p>
            {theater.branchName && `${theater.branchName} • `}
            {theater.city}
          </p>
        </div>
      </div>

      {/* ORDER STATS */}
      <div className="dashboard-stats">
        <div className="stat-box"><span>📦 Total</span><strong>{totalOrders}</strong></div>
        <div className="stat-box"><span>💰 Revenue</span><strong>{formatCurrency(totalRevenue)}</strong></div>
        <div className="stat-box"><span>🆕 Placed</span><strong>{placedCount}</strong></div>
        <div className="stat-box"><span>🍳 Preparing</span><strong>{preparingCount}</strong></div>
        <div className="stat-box"><span>🟢 Ready</span><strong>{readyCount}</strong></div>
        <div className="stat-box"><span>✅ Delivered</span><strong>{deliveredCount}</strong></div>
      </div>

      {/* THEATER INFO */}
      <div className="dashboard-info">
        <div className="info-card">
          <h3>Working Hours</h3>
          <p>{formatTime(theater.openingTime)} – {formatTime(theater.closingTime)}</p>
        </div>
        <div className="info-card">
          <h3>Screens</h3>
          <p>{theater.totalScreens || "—"}</p>
        </div>
        <div className="info-card">
          <h3>Contact</h3>
          <p>{theater.contactNumber || "—"}</p>
        </div>
        <div className="info-card">
          <h3>Address</h3>
          <p>{theater.address || "—"}</p>
        </div>
        <div className="info-card">
          <h3>Email</h3>
          <p>{theater.email || "—"}</p>
        </div>
        <div className="info-card">
          <h3>Owner</h3>
          <p>{theater.ownerName || "—"}</p>
        </div>
      </div>

      {/* QUICK ACTIONS -- removed per user request */}

      {/* WORKER NOTICE — assignedTheaterId still missing from login */}
      {role === "worker" && !localStorage.getItem("assignedTheaterId") && (
        <div className="api-notice" style={{
          background: "#fff8e1", border: "1px solid #ffe082",
          borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#795548",
        }}>
          ⚠️ Worker theater assignment requires backend to return{" "}
          <code>assignedTheaterId</code> in{" "}
          <code>POST /api/auth/login</code> response for role: "worker".
        </div>
      )}

    </div>

  );

};

export default TheaterDashboard;