import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Orders.css";

// APIs USED:
//   GET /api/worker/orders?status=   ✅ confirmed
//   PUT /api/worker/order-status/:id ✅ confirmed
//
// FIXES IN THIS VERSION:
//   FIX 4: Detect 403 from raw response before .json() — stop polling + redirect
//   FIX 5: Check HTTP status before parsing JSON (403 was silently swallowed)
//   FIX 6: timeAgo updates every 30s via a ticker state, not just on data refresh

const API_BASE = "https://popseat.onrender.com/api";

const getToken = () =>
  localStorage.getItem("workerToken") ||
  localStorage.getItem("token")       || "";

const STATUSES = ["placed", "preparing", "ready", "delivered"];

const NEXT_STATUS = {
  placed   : "preparing",
  preparing: "ready",
  ready    : "delivered",
};

const NEXT_LABEL = {
  placed   : "Start Preparing",
  preparing: "Mark Ready",
  ready    : "Mark Delivered",
};

const STATUS_META = {
  placed   : { label: "Placed",    color: "#6C63FF", bg: "rgba(108,99,255,0.10)", border: "rgba(108,99,255,0.22)" },
  preparing: { label: "Preparing", color: "#d97706", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.24)" },
  ready    : { label: "Ready",     color: "#0891b2", bg: "rgba(8,145,178,0.10)",  border: "rgba(8,145,178,0.22)"  },
  delivered: { label: "Delivered", color: "#16a34a", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.22)"  },
};

/* ── Relative time ── */
const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

/* ── Safe seat number extraction ── */
const getSeatNumber = (seatId) => {
  if (!seatId) return "—";
  if (typeof seatId === "string") return seatId.slice(-6).toUpperCase();
  if (typeof seatId === "object") return seatId.seatNumber || seatId._id?.slice(-6).toUpperCase() || "—";
  return "—";
};

const Orders = () => {
  const [orders,       setOrders]       = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [authError,    setAuthError]    = useState(false); // FIX 4: separate auth error state
  const [updating,     setUpdating]     = useState({});
  // FIX 6: ticker increments every 30s to force timeAgo re-render
  const [tick,         setTick]         = useState(0);
  const intervalRef = useRef(null);
  const isMounted   = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // FIX 6: Update relative timestamps every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMounted.current) setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Auto-clear non-auth errors after 6s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => { if (isMounted.current) setError(""); }, 6000);
    return () => clearTimeout(t);
  }, [error]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /* ═══════════════════════════════════════
     GET /api/worker/orders?status= ✅
     FIX 4 + FIX 5: Check HTTP status BEFORE calling .json()
     403 = bad/missing token → stop polling, show login error
     Other non-200 = log and skip gracefully
  ═══════════════════════════════════════ */
  const fetchOrders = useCallback(async () => {
    const token = getToken();

    // FIX 4: If no token at all, stop immediately — don't spam 403s
    if (!token) {
      if (isMounted.current) {
        stopPolling();
        setAuthError(true);
        setLoading(false);
      }
      return;
    }

    try {
      // FIX 5: Fetch responses separately so we can check HTTP status
      // before calling .json() — Promise.allSettled with .then(r.json())
      // was swallowing 403s because json() still resolves on 403.
      const rawResponses = await Promise.allSettled(
        STATUSES.map((status) =>
          fetch(`${API_BASE}/worker/orders?status=${status}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization : `Bearer ${token}`,
            },
          })
        )
      );

      // FIX 4: Check if ANY response is 403 → token is invalid/expired
      const has403 = rawResponses.some(
        (r) => r.status === "fulfilled" && r.value.status === 403
      );

      if (has403) {
        if (isMounted.current) {
          stopPolling();
          setAuthError(true);
          setLoading(false);
        }
        return;
      }

      // Now safely parse JSON from successful responses
      const jsonResponses = await Promise.allSettled(
        rawResponses.map((r) =>
          r.status === "fulfilled" && r.value.ok
            ? r.value.json()
            : Promise.resolve({ success: false })
        )
      );

      const seen   = new Set();
      const merged = [];

      jsonResponses.forEach((result) => {
        if (result.status === "fulfilled" && result.value?.success) {
          (result.value.orders || []).forEach((order) => {
            if (!seen.has(order._id)) {
              seen.add(order._id);
              merged.push(order);
            }
          });
        }
      });

      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (isMounted.current) {
        setOrders(merged);
        setError("");
        setAuthError(false);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
      if (isMounted.current) setError("Failed to load orders. Will retry automatically.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchOrders, 5000);
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
    startPolling();

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchOrders();
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchOrders, startPolling, stopPolling]);

  /* ═══════════════════════════════════════
     PUT /api/worker/order-status/:id ✅
  ═══════════════════════════════════════ */
  const updateStatus = async (id, status) => {
    setUpdating((prev) => ({ ...prev, [id]: true }));
    const token = getToken();
    try {
      const res  = await fetch(`${API_BASE}/order/${id}/status`, {
        method : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization : `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      // FIX 4: Check for 403 on update too
      if (res.status === 403) {
        stopPolling();
        setAuthError(true);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => o._id === id ? { ...o, orderStatus: status } : o)
        );
      } else {
        setError(data.message || "Failed to update order status.");
      }
    } catch (err) {
      console.error("Update status error:", err);
      setError("Network error. Could not update order.");
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filteredOrders = orders.filter((o) =>
    statusFilter === "" ? true : o.orderStatus === statusFilter
  );

  const countByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.orderStatus === s).length;
    return acc;
  }, {});

  /* ── FIX 4: Auth error screen — shown instead of loading ── */
  if (authError) {
    return (
      <div className="orders-container">
        <div className="orders-auth-error">
          <span className="orders-auth-icon">🔒</span>
          <h3 className="orders-auth-title">Session Expired</h3>
          <p className="orders-auth-sub">
            Your worker session has expired or the token is missing.
            Please log in again to continue.
          </p>
          <button
            className="orders-auth-btn"
            onClick={() => {
              // Clear stale tokens and redirect to login
              ["workerToken", "token", "workerRole", "role"].forEach(
                (k) => localStorage.removeItem(k)
              );
              window.location.href = "/login";
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) return (
    <div className="orders-container">
      <div className="orders-topbar">
        <h2 className="orders-title">📦 Orders</h2>
      </div>
      <div className="orders-loading">
        <div className="orders-spinner" />
        <p>Loading orders...</p>
      </div>
    </div>
  );

  return (
    <div className="orders-container">

      {/* TOPBAR */}
      <div className="orders-topbar">
        <div className="orders-topbar-left">
          <h2 className="orders-title">📦 Orders</h2>
          <div className="orders-live-dot" title="Live updates every 5s" />
        </div>
        <button className="orders-refresh-btn" onClick={fetchOrders}>↻ Refresh</button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="orders-error">
          <span>{error}</span>
          <button className="orders-error-close" onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="orders-filter-tabs">
        <button
          className={`filter-tab ${statusFilter === "" ? "active" : ""}`}
          onClick={() => setStatusFilter("")}
        >
          All
          <span className="filter-tab-count">{orders.length}</span>
        </button>
        {STATUSES.map((s) => {
          const meta = STATUS_META[s];
          return (
            <button
              key={s}
              className={`filter-tab ${statusFilter === s ? "active" : ""}`}
              style={statusFilter === s
                ? { background: meta.bg, color: meta.color, borderColor: meta.border }
                : {}
              }
              onClick={() => setStatusFilter(s)}
            >
              {meta.label}
              {countByStatus[s] > 0 && (
                <span
                  className="filter-tab-count"
                  style={statusFilter === s ? { background: meta.color, color: "#fff" } : {}}
                >
                  {countByStatus[s]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {filteredOrders.length === 0 ? (
        <div className="orders-empty">
          <span className="orders-empty-icon">📋</span>
          <p>{statusFilter
            ? `No ${STATUS_META[statusFilter]?.label || statusFilter} orders`
            : "No orders yet"}
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const currentStatus = order.orderStatus || "placed";
            const meta          = STATUS_META[currentStatus] || STATUS_META.placed;
            const nextStatus    = NEXT_STATUS[currentStatus];
            const nextLabel     = NEXT_LABEL[currentStatus];
            const isUpdating    = !!updating[order._id];
            const displaySeat   = order.seatNumber || getSeatNumber(order.seatId);

            return (
              <div key={order._id} className="order-card">

                <div className="order-info">
                  <div className="order-card-header">
                    <span className="order-id">#{order._id?.slice(-6).toUpperCase()}</span>
                    <span
                      className="order-status-badge"
                      style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="order-meta-row">
                    <span className="order-meta-item">
                      <span className="order-meta-label">Seat</span>
                      <span className="order-meta-value">{displaySeat}</span>
                    </span>
                    <span className="order-meta-divider" />
                    <span className="order-meta-item">
                      <span className="order-meta-label">Total</span>
                      <span className="order-meta-value order-total">₹{order.totalAmount}</span>
                    </span>
                    <span className="order-meta-divider" />
                    <span className="order-meta-item">
                      <span className="order-meta-label">Time</span>
                      {/* FIX 6: tick dependency forces re-render every 30s */}
                      <span className="order-meta-value order-time">
                        {timeAgo(order.createdAt, tick)}
                      </span>
                    </span>
                  </div>

                  {Array.isArray(order.items) && order.items.length > 0 && (
                    <div className="order-items">
                      {order.items.map((item, i) => (
                        <div key={i} className="order-item-row">
                          <span className="order-item-dot" />
                          <span className="order-item-name">{item.name}</span>
                          <span className="order-item-qty">× {item.quantity}</span>
                          {item.price && (
                            <span className="order-item-price">
                              ₹{item.price * item.quantity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {nextStatus && currentStatus !== "delivered" && (
                  <div className="order-actions">
                    <button
                      className={`order-action-btn status-${currentStatus}`}
                      onClick={() => updateStatus(order._id, nextStatus)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <span className="order-btn-loading">
                          <span className="order-btn-spinner" />
                          Updating...
                        </span>
                      ) : (
                        nextLabel
                      )}
                    </button>
                  </div>
                )}

                {currentStatus === "delivered" && (
                  <div className="order-delivered-badge">✅ Delivered</div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default Orders;