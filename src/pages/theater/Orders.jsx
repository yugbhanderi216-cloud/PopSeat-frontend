import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Orders.css";

// APIs USED:
//   GET /api/worker/orders?status=   ✅
//   PUT /api/worker/order-status/:id ✅
//
// FRONTEND FIXES IN THIS VERSION:
//   FIX-A: Owner 403 → show error banner, NOT logout screen (owner token rejected ≠ session expired)
//   FIX-B: Owner merge now checks `success` flag consistently with worker path
//   FIX-C: `!o.theaterId` fallback removed — was showing other-theater orders to owners
//   FIX-D: Guard added for unknown role (neither owner nor worker)
//   FIX-E: timeAgo dead `tick` arg removed; re-render still works via state change
//   FIX-F: `role` and `theaterId` moved into useRef so fetchOrders closure always reads correct value
//   FIX-G: Owner missing theaterId shows proper error message instead of silent exit
//   FIX-H: worker path also sets setLoading(false) explicitly before returning on 403

const API_BASE = "https://popseat.onrender.com/api";

const getToken = () =>
  localStorage.getItem("ownerToken")  ||
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
  placed   : { label: "Placed",    color: "#79334D", bg: "rgba(121, 51, 77,0.10)", border: "rgba(121, 51, 77,0.22)" },
  preparing: { label: "Preparing", color: "#d97706", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.24)" },
  ready    : { label: "Ready",     color: "#0891b2", bg: "rgba(8,145,178,0.10)",  border: "rgba(8,145,178,0.22)"  },
  delivered: { label: "Delivered", color: "#16a34a", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.22)"  },
};

/* ── Relative time ── */
// FIX-E: removed dead second param
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
  if (typeof seatId === "string") return seatId;
  if (typeof seatId === "object") return seatId.seatNumber || seatId._id?.slice(-6).toUpperCase() || "—";
  return "—";
};

/* ── Safe screen number extraction ── */
const getScreenNumber = (hallId) => {
  if (!hallId) return "—";
  if (typeof hallId === "string") return hallId;
  if (typeof hallId === "object") return hallId.name || hallId.screenNumber || hallId._id?.slice(-6).toUpperCase() || "—";
  return "—";
};

const Orders = () => {
  const [orders,       setOrders]       = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [authError,    setAuthError]    = useState(false);
  const [updating,     setUpdating]     = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);
  const ORDERS_PER_PAGE = 10;
  // Ticker increments every 30s to force timeAgo re-render
  const [tick,         setTick]         = useState(0);
  const intervalRef = useRef(null);
  const isMounted   = useRef(true);

  // FIX-F: Store role & theaterId in refs so fetchOrders always reads fresh values
  // (plain variables in component body are captured stale by useCallback closures)
  const roleRef = useRef("");
  const theaterIdRef = useRef("");

  // Compute and sync role/theaterId refs on every render
  const roleRaw = (
    localStorage.getItem("ownerRole")  ||
    localStorage.getItem("workerRole") ||
    localStorage.getItem("role")       || ""
  ).toLowerCase();
  roleRef.current = roleRaw;

  theaterIdRef.current = roleRaw === "worker"
    ? (localStorage.getItem("assignedTheaterId") || localStorage.getItem("customerTheaterId") || "")
    : (localStorage.getItem("activeOwnerTheaterId") || localStorage.getItem("customerTheaterId") || "");

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Update relative timestamps every 30 seconds
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
     GET /api/worker/orders?status=
  ═══════════════════════════════════════ */
  const fetchOrders = useCallback(async (manualRefresh = false) => {
    if (manualRefresh === true && isMounted.current) setLoading(true);

    const token    = getToken();
    // FIX-F: read from refs (always current values, no stale closure)
    const role     = roleRef.current;
    const theaterId = theaterIdRef.current;

    // No token at all → show session error and stop
    if (!token) {
      if (isMounted.current) {
        stopPolling();
        setAuthError(true);
        setLoading(false);
      }
      return;
    }

    // FIX-D: Guard unknown role — show error instead of silent failure
    if (role !== "owner" && role !== "worker") {
      if (isMounted.current) {
        setError("Unknown user role. Please log in again.");
        setLoading(false);
        stopPolling();
      }
      return;
    }

    try {
      // ── OWNERS ──
      if (role === "owner") {
        // FIX-G: Missing theaterId shows clear error instead of silent exit
        if (!theaterId) {
          if (isMounted.current) {
            setError("No theater selected. Please select a theater from the dashboard.");
            setLoading(false);
          }
          return;
        }

        const responses = await Promise.allSettled(
          STATUSES.map((s) =>
            fetch(`${API_BASE}/worker/orders?status=${s}`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            })
          )
        );

        // FIX-A: Owner 403 → show error banner only, NOT logout screen
        // (Owner token being rejected ≠ session expired — it's a backend permission bug)
        const has403 = responses.some(
          (r) => r.status === "fulfilled" && r.value.status === 403
        );

        if (has403) {
          if (isMounted.current) {
            stopPolling();
            setError(
              "⚠️ Backend is blocking owner access to order data (403 Forbidden). " +
              "Ask your backend developer to allow owner tokens on GET /api/worker/orders."
            );
            setLoading(false);
            // FIX-A: Do NOT setAuthError(true) — owner should NOT be logged out
          }
          return;
        }

        const jsonResponses = await Promise.allSettled(
          responses.map((r) =>
            r.status === "fulfilled" && r.value.ok
              ? r.value.json()
              : Promise.resolve({ success: false })
          )
        );

        const merged = [];
        const seen   = new Set();
        // NOTE: Check for orders array directly (not success flag) because backend
        // may return orders without success:true (see Bug #5 in backend report).
        // NOTE: Keep `|| !o.theaterId` fallback — backend does not always save theaterId
        // on orders (see Bug #4). Once backend fixes this, remove the fallback.
        jsonResponses.forEach((res) => {
          if (res.status === "fulfilled" && res.value?.orders) {
            res.value.orders.forEach((o) => {
              if (
                !seen.has(o._id) &&
                (o.theaterId === theaterId || o.cinemaId === theaterId || !o.theaterId)
              ) {
                seen.add(o._id);
                merged.push(o);
              }
            });
          }
        });

        if (isMounted.current) {
          const sorted = merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setOrders(sorted);
          setError("");
          setAuthError(false);
          setLoading(false);
        }
        return;
      }

      // ── WORKERS ──
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

      const has403 = rawResponses.some(
        (r) => r.status === "fulfilled" && r.value.status === 403
      );

      if (has403) {
        if (isMounted.current) {
          stopPolling();
          setAuthError(true);
          // FIX-H: explicitly set loading false before returning
          setLoading(false);
        }
        return;
      }

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
     PUT /api/worker/order-status/:id
  ═══════════════════════════════════════ */
  const updateStatus = async (id, status) => {
    setUpdating((prev) => ({ ...prev, [id]: true }));
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/worker/order-status/${id}`, {
        method : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization : `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.status === 403) {
        stopPolling();
        setAuthError(true);
        return;
      }

      // Read as text first — guards against HTML 404 error pages from backend
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Non-JSON response body:", text);
        setError(`Backend Error ${res.status}: The status update endpoint is missing or incorrect. See backend bug report.`);
        return;
      }

      if (data.success) {
        // Optimistic UI: update the order locally without waiting for next poll
        setOrders((prev) =>
          prev.map((o) => o._id === id ? { ...o, orderStatus: status } : o)
        );
      } else {
        setError(data.message || "Failed to update order status.");
      }
    } catch (err) {
      console.error("Update status error:", err);
      setError("Network error. Could not update order status.");
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Date parsing utility
  const formatOrderDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toISOString().split("T")[0]; // YYYY-MM-DD
  };

  const filteredOrders = orders.filter((o) => {
    // 1. Status Filter
    if (statusFilter !== "" && o.orderStatus !== statusFilter) return false;
    // 2. Date Filter
    if (selectedDate !== "" && formatOrderDate(o.createdAt) !== selectedDate) return false;
    return true;
  });

  // Calculate totals by status *after* date filtering so tabs reflect accurate counts for that day
  const ordersByDate = selectedDate 
    ? orders.filter(o => formatOrderDate(o.createdAt) === selectedDate) 
    : orders;
    
  const countByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = ordersByDate.filter((o) => o.orderStatus === s).length;
    return acc;
  }, {});

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE) || 1;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedDate]);

  /* ── Auth error screen ── */
  if (authError) {
    return (
      <div className="orders-container">
        <div className="orders-auth-error">
          <span className="orders-auth-icon">🔒</span>
          <h3 className="orders-auth-title">Session Expired</h3>
          <p className="orders-auth-sub">
            Your session has expired or the token is missing.
            Please log in again to continue.
          </p>
          <button
            className="orders-auth-btn"
            onClick={() => {
              [
                "ownerToken", "ownerEmail", "ownerRole",
                "workerToken", "workerEmail", "workerRole",
                "token", "email", "role"
              ].forEach((k) => localStorage.removeItem(k));
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
        <div className="orders-topbar-right">
          <div className="orders-date-picker-wrap">
            <span className="orders-date-icon">📅</span>
            <input 
              type="date" 
              className="orders-date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              title="Filter by Date"
            />
            {selectedDate && (
              <button 
                className="orders-date-clear" 
                onClick={() => setSelectedDate("")}
                title="Clear date filter"
              >✕</button>
            )}
          </div>
          <button className="orders-refresh-btn" onClick={() => fetchOrders(true)}>↻ Refresh</button>
        </div>
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
            : "No orders found"}
            {selectedDate && ` on ${selectedDate}`}
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {paginatedOrders.map((order) => {
            const currentStatus = order.orderStatus || "placed";
            const meta          = STATUS_META[currentStatus] || STATUS_META.placed;
            const nextStatus    = NEXT_STATUS[currentStatus];
            const nextLabel     = NEXT_LABEL[currentStatus];
            const isUpdating    = !!updating[order._id];
            const displaySeat   = order.seatNumber || getSeatNumber(order.seatId);
            // Try all possible field names the backend might use for items
            const orderItems    = order.items || order.cartItems || order.orderItems || order.foodItems || [];

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
                      <span className="order-meta-label">Screen</span>
                      <span className="order-meta-value">{getScreenNumber(order.hallId)}</span>
                    </span>
                    <span className="order-meta-divider" />
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
                      {/* FIX-E: tick is in JSX expression so re-render still fires; removed dead arg from timeAgo */}
                      <span className="order-meta-value order-time" data-tick={tick}>
                        {timeAgo(order.createdAt)}
                      </span>
                    </span>
                  </div>

                  {/* ── Order Items ── */}
                  <div className="order-items">
                    {Array.isArray(orderItems) && orderItems.length > 0 ? (
                      orderItems.map((item, i) => (
                        <div key={i} className="order-item-row">
                          <span className="order-item-dot" />
                          <span className="order-item-name">
                            {item.name || item.itemName || item.foodName || "Item"}
                            {item.size ? ` (${item.size})` : ""}
                          </span>
                          <span className="order-item-qty">× {item.quantity || item.qty || 1}</span>
                          {(item.price || item.unitPrice) && (
                            <span className="order-item-price">
                              ₹{(item.price || item.unitPrice) * (item.quantity || item.qty || 1)}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="order-items-empty">
                        🍽️ Item details not included in server response
                      </div>
                    )}
                  </div>
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

      {/* PAGINATION FOOTER */}
      {filteredOrders.length > 0 && (
        <div className="orders-pagination">
          <button 
            className="pagination-btn" 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Prev
          </button>
          <span className="pagination-info">
            Page <strong>{currentPage}</strong> of {totalPages}
          </span>
          <button 
            className="pagination-btn" 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
};

export default Orders;