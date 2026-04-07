import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./WorkerDashboard.css";

// ─────────────────────────────────────────────────────────────
// APIs USED:
//   GET /api/worker/orders?status= ✅ — fetches all 4 statuses
//   PUT /api/worker/order-status/:id ✅ — updates order status
//
//   Worker login response should include theaterId
//   so WorkerDashboard can filter orders by theater.
// ─────────────────────────────────────────────────────────────

// FIX: Standardized to include /api — consistent with Orders.jsx and Analytics.jsx
const API_BASE = "https://popseat.onrender.com/api";

const authHeaders = () => ({
  "Content-Type" : "application/json",
  Authorization  : `Bearer ${localStorage.getItem("token") || ""}`,
});

// Status flow — lowercase only (API never returns Title Case)
// FIX: removed Preparing/Ready/Delivered Title Case entries — dead code
const STATUS_FLOW = {
  placed    : { next: "preparing", label: "Start Preparing", color: "#3B82F6" },
  preparing : { next: "ready",     label: "Mark Ready",      color: "#F59E0B" },
  ready     : { next: "delivered", label: "Mark Delivered",  color: "#22C55E" },
};

const STATUS_BADGE = {
  placed    : { bg: "rgba(59,130,246,0.10)",  color: "#3B82F6", label: "Placed"    },
  preparing : { bg: "rgba(245,158,11,0.10)",  color: "#F59E0B", label: "Preparing" },
  ready     : { bg: "rgba(34,197,94,0.10)",   color: "#22C55E", label: "Ready"     },
  delivered : { bg: "rgba(121, 51, 77,0.10)",  color: "#79334D", label: "Delivered" },
};

// All statuses a worker needs to see
// FIX: was only "pending" (not even a valid status) →
//      now fetches placed/preparing/ready so worker sees
//      all active orders and can progress them
const ACTIVE_STATUSES = ["placed", "preparing", "ready"];

const WorkerDashboard = () => {

  const navigate = useNavigate();

  // FIX: removed "loggedInUser" fallback — old localStorage system removed
  const email = localStorage.getItem("email") || "";
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const theaterId = localStorage.getItem("theaterId") || "";

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  /* ── Auth guard ──
     FIX: removed "branch" from role check — API has no "branch" role
  ── */

  useEffect(() => {
    if (!email || role !== "worker") {
      navigate("/login", { replace: true });
    }
  }, [email, role, navigate]);

  /* ===============================
     LOAD ORDERS — GET /api/worker/orders?status= ✅
     FIX: was only fetching "pending" (not a valid API status)
          Workers need placed + preparing + ready to do their job:
          - "placed"    → needs to start preparing
          - "preparing" → needs to mark ready
          - "ready"     → needs to mark delivered
          "delivered" excluded — no action needed on those
     FIX: removed entire localStorage fallback system —
          dead code referencing "users", "orders", "loggedInUser"
  =============================== */

  const loadOrders = useCallback(async () => {
    if (!theaterId) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE}/orders?cinemaId=${theaterId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      const merged = (data.orders || (Array.isArray(data) ? data : []))
        .filter(o => ACTIVE_STATUSES.includes(o.orderStatus));

      // Sort: placed first, then preparing, then ready — action priority
      const statusOrder = { placed: 0, preparing: 1, ready: 2 };
      merged.sort((a, b) => {
        const sa = statusOrder[a.orderStatus] ?? 99;
        const sb = statusOrder[b.orderStatus] ?? 99;
        if (sa !== sb) return sa - sb;
        // Within same status, newest first
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setOrders(merged);

    } catch (err) {
      console.error("Load orders error:", err);
      setError("Failed to load orders. Retrying...");
    } finally {
      setLoading(false);
    }

  }, []);

  useEffect(() => {

    loadOrders();

    // FIX: was 3000ms — standardized to 5000ms across all files
    const interval = setInterval(loadOrders, 5000);

    // Pause when tab hidden
    const handleVisibility = () => {
      if (!document.hidden) loadOrders();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };

  }, [loadOrders]);

  /* ===============================
     UPDATE STATUS — PUT /api/worker/order-status/:id ✅
     FIX: removed localStorage fallback — old system
     FIX: replaced alert() with inline error state
  =============================== */

  const updateStatus = async (orderId, newStatus) => {

    setUpdatingId(orderId);
    setError("");

    try {

      const res  = await fetch(
        `${API_BASE}/worker/order-status/${orderId}`,
        {
          method  : "PUT",
          headers : authHeaders(),
          body    : JSON.stringify({ status: newStatus }),
        }
      );

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Non-JSON Response:", text);
        setError(`Backend Error ${res.status}: Update endpoint not found or incorrect.`);
        setUpdatingId(null);
        return;
      }

      if (data.success) {

        // Optimistic update — instant UI feedback
        setOrders((prev) =>
          newStatus === "delivered"
            // Remove from list once delivered — no more actions needed
            ? prev.filter((o) => o._id !== orderId)
            // Otherwise update status in place
            : prev.map((o) =>
                o._id === orderId
                  ? { ...o, orderStatus: newStatus }
                  : o
              )
        );

      } else {
        setError(data.message || "Failed to update order status.");
      }

    } catch (err) {
      console.error("Update status error:", err);
      // FIX: was alert() — now inline error
      setError("Network error. Could not update order status.");
    } finally {
      setUpdatingId(null);
    }

  };

  /* ── Render ── */

  return (

    <div className="worker-page">

      {/* PAGE TITLE BAR */}
      <div className="worker-title-bar">
        <h1>👷 Live Orders</h1>
        <span className="live-badge">● Live</span>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* CONTENT */}
      {loading ? (

        <div className="worker-state">
          <div className="state-icon">⏳</div>
          <p>Loading orders...</p>
        </div>

      ) : orders.length === 0 ? (

        <div className="worker-state">
          <div className="state-icon">✅</div>
          <p>No active orders right now</p>
          <small>Auto-refreshes every 5 seconds</small>
        </div>

      ) : (

        <div className="orders-grid">

          {orders.map((order) => {

            const status     = order.orderStatus || "placed";
            // FIX: STATUS_BADGE only has lowercase keys now
            const badge      = STATUS_BADGE[status] || STATUS_BADGE.placed;
            const action     = STATUS_FLOW[status];
            const ordId      = order._id;
            const isUpdating = updatingId === ordId;
            // Fallback: items is the primary field in the new schema
            const orderItems = (order?.items || []);

            return (

              <div key={ordId} className="order-card">

                <div className="order-card-header">
                  <span className="order-id">
                    #{String(ordId).slice(-6).toUpperCase()}
                  </span>
                  <span
                    className="order-status-badge"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    ● {badge.label}
                  </span>
                </div>

                <div className="order-details">

                  <div className="order-detail-row">
                    <span className="detail-label">Screen</span>
                    <span className="detail-value">
                      {order.hallId?.name || order.hallId || order.screenNo || "—"}
                    </span>
                  </div>

                  <div className="order-detail-row">
                    <span className="detail-label">Seat</span>
                    <span className="detail-value">
                      {order.seatId?.seatNumber || order.seatId || order.seatNumber || "—"}
                    </span>
                  </div>

                  <div className="order-detail-row">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value">
                      ₹ {Number(order?.totalAmount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="order-detail-row">
                    <span className="detail-label">Time</span>
                    <span className="detail-value">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>

                </div>

                {/* Items list */}
                {Array.isArray(orderItems) && orderItems.length > 0 && (
                  <div className="order-items">
                    {orderItems.map((item, i) => (
                      <div key={i} className="order-item-row">
                        <span>{item?.name || "Item"}</span>
                        <span>×{item?.quantity || 1}</span>
                        <span>₹{(item?.price || 0) * (item?.quantity || 1)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action button */}
                {action ? (
                  <button
                    className="action-btn"
                    style={{ background: action.color }}
                    onClick={() => updateStatus(ordId, action.next)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating..." : action.label}
                  </button>
                ) : status === "delivered" ? (
                  <div className="delivered-tag">✅ Delivered</div>
                ) : null}

              </div>

            );

          })}

        </div>

      )}

    </div>

  );

};

export default WorkerDashboard;
