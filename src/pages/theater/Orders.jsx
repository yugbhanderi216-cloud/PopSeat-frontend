import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Orders.css";

// APIs USED:
//   GET /api/worker/orders?status=   ✅
//   PUT /api/worker/order-status/:id ✅

const API_BASE = "https://popseat.onrender.com/api";

const getToken = () =>
  localStorage.getItem("ownerToken") ||
  localStorage.getItem("workerToken") ||
  localStorage.getItem("token") || "";

const STATUSES = ["placed", "preparing", "ready", "delivered"];

const NEXT_STATUS = {
  placed: "preparing",
  preparing: "ready",
  ready: "delivered",
};

const NEXT_LABEL = {
  placed: "Start Preparing",
  preparing: "Mark Ready",
  ready: "Mark Delivered",
};

const STATUS_META = {
  placed: { label: "Placed", color: "#79334D", bg: "rgba(121, 51, 77,0.10)", border: "rgba(121, 51, 77,0.22)" },
  preparing: { label: "Preparing", color: "#d97706", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.24)" },
  ready: { label: "Ready", color: "#0891b2", bg: "rgba(8,145,178,0.10)", border: "rgba(8,145,178,0.22)" },
  delivered: { label: "Delivered", color: "#16a34a", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.22)" },
};

/* ── Relative time ── */
const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
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
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState(false);
  const [updating, setUpdating] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ORDERS_PER_PAGE = 8;
  const [tick, setTick] = useState(0);
  const [isPrimary, setIsPrimary] = useState(false);
  const [theaterList, setTheaterList] = useState([]);
  const intervalRef = useRef(null);
  const isMounted = useRef(true);

  const role = (
    localStorage.getItem("ownerRole") ||
    localStorage.getItem("workerRole") ||
    localStorage.getItem("role") || ""
  ).toLowerCase();

  const theaterId = role === "worker"
    ? (localStorage.getItem("assignedTheaterId") || "")
    : (localStorage.getItem("activeOwnerTheaterId") || "");

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  /* ── 📝 SMART ISOLATION: Fetch owner's theaters to identify the primary one ── */
  useEffect(() => {
    if (role !== "owner" || !theaterId) return;
    const checkPrimaryStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/cinema`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        const list = data.cinemas || data.data || [];
        if (data.success && Array.isArray(list) && list.length > 0) {
          if (isMounted.current) setTheaterList(list);
          const sorted = [...list].sort((a, b) => a._id.localeCompare(b._id));
          const primaryId = sorted[0]._id;
          if (isMounted.current) setIsPrimary(theaterId === primaryId);
        }
      } catch (err) {
        console.warn("Smart Isolation (Orders): Fetch failed.", err);
      }
    };
    checkPrimaryStatus();
  }, [role, theaterId]);

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), []);

  const fetchOrders = useCallback(async () => {
    if (!theaterId && role !== "worker") {
      setError("No theater ID found. Please go back to dashboard.");
      setLoading(false);
      return;
    }

    try {
      const responses = await Promise.allSettled(
        STATUSES.map((status) =>
          fetch(`${API_BASE}/worker/orders?status=${status}`, {
            headers: authHeaders(),
          }).then((res) => {
            if (res.status === 401 || res.status === 403) throw new Error("AUTH_ERROR");
            if (!res.ok) throw new Error(`Failed ${status}`);
            return res.json();
          })
        )
      );

      const seen = new Set();
      const merged = [];

      responses.forEach((res) => {
        if (res.status === "fulfilled" && (res.value?.orders || Array.isArray(res.value))) {
          const ordersArr = res.value.orders || (Array.isArray(res.value) ? res.value : []);
          ordersArr.forEach((o) => {
            /* ═══════════════════════════════════════════════════════
               📝 SMARTER ISOLATION FILTER
            ═══════════════════════════════════════════════════════ */
            const matchesId = (o.theaterId === theaterId || o.cinemaId === theaterId);

            // Unknown theaters = Legacy = Shown in Primary
            const isKnown = theaterList.some(t => (t._id === o.theaterId || t._id === o.cinemaId));
            const isLegacy = !isKnown;

            const shouldInclude = (role === "worker")
              ? true
              : (matchesId || (isPrimary && isLegacy));

            if (!seen.has(o._id) && shouldInclude) {
              seen.add(o._id);
              merged.push(o);
            }
          });
        } else if (res.status === "rejected" && res.reason?.message === "AUTH_ERROR") {
          setAuthError(true);
        }
      });

      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (isMounted.current) {
        setOrders(merged);
        setError("");
        setLoading(false);
      }
    } catch (err) {
      if (isMounted.current) {
        if (orders.length === 0) setError("Failed to load orders.");
        setLoading(false);
      }
    }
  }, [authHeaders, role, theaterId, isPrimary, orders.length]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(fetchOrders, 30000);
    const ticker = setInterval(() => { if (isMounted.current) setTick(t => t + 1); }, 30000);
    return () => {
      stopPolling();
      clearInterval(ticker);
    };
  }, [fetchOrders, stopPolling]);

  useEffect(() => {
    fetchOrders();
    const cleanup = startPolling();
    const handleVisibility = () => {
      if (document.hidden) stopPolling();
      else fetchOrders();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cleanup();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchOrders, startPolling, stopPolling]);

  const updateStatus = async (orderId, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;

    setUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`${API_BASE}/worker/order-status/${orderId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.success) fetchOrders();
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      if (isMounted.current) setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter && o.orderStatus !== statusFilter) return false;
    if (selectedDate) {
      const oDate = new Date(o.createdAt).toISOString().split("T")[0];
      if (oDate !== selectedDate) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const currentOrders = filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);

  if (authError) {
    return (
      <div className="orders-container">
        <div className="orders-auth-error">
          <span className="orders-auth-icon">⚠️</span>
          <h3 className="orders-auth-title">Authentication Error</h3>
          <p className="orders-auth-sub">Access denied. Please ensure you are logged in correctly.</p>
        </div>
      </div>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <div className="orders-container">
        <div className="orders-loading">
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-topbar">
        <div className="orders-topbar-left">
          <h1 className="orders-title">Orders Dashboard</h1>
          <p className="order-time">{filteredOrders.length} orders found</p>
        </div>
        <div className="orders-topbar-right">
          <div className="orders-date-picker-wrap">
            <span className="orders-date-icon">📅</span>
            <input
              type="date"
              className="orders-date-input"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
            />
            {selectedDate && <button className="orders-date-clear" onClick={() => setSelectedDate("")}>✕</button>}
          </div>
          <button className="orders-refresh-btn" onClick={() => { setLoading(true); fetchOrders(); }}>↻ Refresh</button>
        </div>
      </div>

      <div className="orders-filter-tabs">
        <button
          className={`filter-tab ${statusFilter === "" ? "active" : ""}`}
          onClick={() => { setStatusFilter(""); setCurrentPage(1); }}
        >
          All <span className="filter-tab-count">{orders.length}</span>
        </button>
        {STATUSES.map(s => {
          const count = orders.filter(o => o.orderStatus === s).length;
          return (
            <button
              key={s}
              className={`filter-tab ${statusFilter === s ? "active" : ""}`}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
            >
              {STATUS_META[s].label} <span className="filter-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {error && <div className="orders-error">{error}</div>}

      <div className="orders-list">
        {currentOrders.map((order) => (
          <div key={order._id} className="order-card">
            <div className="order-info">
              <div className="order-card-header">
                <span className="order-id">#{order._id?.slice(-6).toUpperCase()}</span>
                <span className={`order-status-badge status-${order.orderStatus}`}>
                  {STATUS_META[order.orderStatus]?.label}
                </span>
              </div>

              <div className="order-meta-row">
                <div className="order-meta-item">
                  <span className="order-meta-label">Customer</span>
                  <span className="order-meta-value">{order.customerName || "Guest"}</span>
                </div>
                <div className="order-meta-divider" />
                <div className="order-meta-item">
                  <span className="order-meta-label">Screen/Seat</span>
                  <span className="order-meta-value">
                    Sc {getScreenNumber(order.hallId)} · {getSeatNumber(order.seatId)}
                  </span>
                </div>
                <div className="order-meta-divider" />
                <div className="order-meta-item">
                  <span className="order-meta-label">Total</span>
                  <span className="order-meta-value order-total">₹{order.totalAmount}</span>
                </div>
                <div className="order-meta-divider" />
                <div className="order-meta-item">
                  <span className="order-meta-label">Time</span>
                  <span className="order-meta-value">{timeAgo(order.createdAt)}</span>
                </div>
              </div>

              <div className="order-items">
                {order.items?.map((it, i) => (
                  <div key={i} className="order-item-row">
                    <div className="order-item-dot" />
                    <span className="order-item-name">{it.menuItemId?.name || "Item"}</span>
                    <span className="order-item-qty">x{it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-actions">
              {NEXT_STATUS[order.orderStatus] ? (
                <button
                  className={`order-action-btn status-${order.orderStatus}`}
                  onClick={() => updateStatus(order._id, order.orderStatus)}
                  disabled={updating[order._id]}
                >
                  {updating[order._id] ? (
                    <div className="order-btn-loading">
                      <div className="order-btn-spinner" /> Updating...
                    </div>
                  ) : NEXT_LABEL[order.orderStatus]}
                </button>
              ) : (
                <div className="order-delivered-badge">Completed ✓</div>
              )}
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && !loading && (
          <div className="orders-empty">
            <span className="orders-empty-icon">📂</span>
            <p>No orders matching filters</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="orders-pagination">
          <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</button>
          <div className="pagination-info">Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></div>
          <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
};

export default Orders;