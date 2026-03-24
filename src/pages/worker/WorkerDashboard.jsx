import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./WorkerDashboard.css";

// ─────────────────────────────────────────────────────────────
// APIs USED:
//   GET /api/worker/orders?status= ✅ — fetches all 4 statuses
//   PUT /api/worker/order-status/:id ✅ — updates order status
//
// ⚠️  MISSING (for backend team):
//   Worker login response should include assignedTheaterId
//   so WorkerDashboard can filter orders by theater.
//   Currently shows ALL orders from all theaters.
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://popseat.onrender.com";

// FIX: was reading only "token" — now uses workerToken fallback
const authHeaders = () => ({
  "Content-Type" : "application/json",
  Authorization  : `Bearer ${
    localStorage.getItem("workerToken") ||
    localStorage.getItem("token")       || ""
  }`,
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
  delivered : { bg: "rgba(108,99,255,0.10)",  color: "#6C63FF", label: "Delivered" },
};

// All statuses a worker needs to see
// FIX: was only "pending" (not even a valid status) →
//      now fetches placed/preparing/ready so worker sees
//      all active orders and can progress them
const ACTIVE_STATUSES = ["placed", "preparing", "ready"];

const WorkerDashboard = () => {

  const navigate = useNavigate();

  // FIX: removed "loggedInUser" fallback — old localStorage system removed
  // FIX: use workerEmail/workerRole keys first for consistency
  const email = (
    localStorage.getItem("workerEmail") ||
    localStorage.getItem("email")       || ""
  );
  const role = (
    localStorage.getItem("workerRole") ||
    localStorage.getItem("role")       || ""
  ).toLowerCase();

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

    setError("");

    try {

      const responses = await Promise.allSettled(
        ACTIVE_STATUSES.map((status) =>
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
        `${API_BASE}/api/worker/order-status/${orderId}`,
        {
          method  : "PUT",
          headers : authHeaders(),
          body    : JSON.stringify({ status: newStatus }),
        }
      );

      const data = await res.json();

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

  /* ── Logout ──
     FIX: was localStorage.clear() — surgical removal only
  ── */

  const handleLogout = () => {
    [
      "workerToken", "workerEmail", "workerRole",
      "token", "email", "role",
      "assignedTheaterId",
    ].forEach((k) => localStorage.removeItem(k));
    navigate("/login");
  };

  /* ── Render ── */

  return (

    <div className="worker-page">

      {/* HEADER */}
      <div className="worker-header">
        <div className="worker-header-left">
          <h1>👷 Live Orders</h1>
          <span className="live-badge">● Live</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div style={{
          background: "#fff3f3", border: "1px solid #fbb",
          borderRadius: 8, padding: "8px 14px",
          margin: "0 0 12px", color: "#c00", fontSize: 13,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
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
                    <span className="detail-label">Seat</span>
                    <span className="detail-value">
                      {order.seatId?.seatNumber || order.seatId || "—"}
                    </span>
                  </div>

                  <div className="order-detail-row">
                    <span className="detail-label">Amount</span>
                    <span className="detail-value">
                      ₹ {order.totalAmount || 0}
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
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="order-items">
                    {order.items.map((item, i) => (
                      <div key={i} className="order-item-row">
                        <span>{item.name}</span>
                        <span>×{item.quantity}</span>
                        <span>₹{item.price}</span>
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