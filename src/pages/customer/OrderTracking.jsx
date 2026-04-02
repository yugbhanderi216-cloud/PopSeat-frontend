import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderTracking.css";

// GET /api/order/:id ✅ confirmed
// Response: {
//   success: true,
//   order: {
//     _id, orderStatus, totalAmount, paymentStatus,
//     seatId: { seatNumber },
//     items: [{ name, quantity, price, total }]
//   }
// }

const API_BASE   = "https://popseat.onrender.com/api";
const STATUS_FLOW = ["placed", "preparing", "ready", "delivered"];

const OrderTracking = () => {

  const navigate = useNavigate();

  const orderId   = localStorage.getItem("currentOrderId")    || "";
  const token     = localStorage.getItem("customerToken")     || "";
  const theaterId = localStorage.getItem("customerTheaterId") || "";
  const screen    = localStorage.getItem("screenNo")          || "";
  const seat      = localStorage.getItem("seatNo")            || "";

  const [order,   setOrder]   = useState(null);
  const [status,  setStatus]  = useState("placed");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  /* ===============================
     FETCH ORDER — GET /api/order/:id ✅
     Confirmed response shape:
     { success, order: { _id, orderStatus, totalAmount,
       seatId: { seatNumber }, items: [{ name, quantity, price }] } }
  =============================== */

  const fetchOrder = useCallback(async () => {

    if (!orderId) {
      setError("No order found. Please place an order first.");
      setLoading(false);
      return;
    }

    try {

      const res  = await fetch(`${API_BASE}/order/${orderId}`, {
        headers: {
          "Content-Type" : "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await res.json();

      if (data.success && data.order) {
        setOrder(data.order);
        setStatus(data.order.orderStatus || "placed");
        setError("");
      } else {
        setError(data.message || "Could not fetch order.");
      }

    } catch (err) {
      console.error("Order fetch error:", err);
      setError("Network error. Retrying...");
    } finally {
      setLoading(false);
    }

  }, [orderId, token]);

  /* ── Poll every 5s, stop once delivered ── */

  useEffect(() => {

    fetchOrder();

    if (status === "delivered") return;

    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);

  }, [fetchOrder, status]);

  /* ── Auto-redirect after delivery ── */

  useEffect(() => {

    if (status !== "delivered") return;

    const timer = setTimeout(() => {
      localStorage.removeItem("currentOrderId");
      localStorage.removeItem("currentPaymentId");
      navigate(
        `/customer/menu?theaterId=${theaterId}&screen=${screen}&seat=${seat}`
      );
    }, 4000);

    return () => clearTimeout(timer);

  }, [status, navigate, theaterId, screen, seat]);

  const statusIndex = STATUS_FLOW.indexOf(status);

  /* ── Loading ── */

  if (loading) {
    return (
      <div className="tracking-page">
        <div className="tracking-card">
          <h2>🎬 Order Tracking</h2>
          <p>Fetching your order...</p>
        </div>
      </div>
    );
  }

  /* ── No order ── */

  if (!orderId) {
    return (
      <div className="tracking-page">
        <div className="tracking-card">
          <h2>🎬 Order Tracking</h2>
          <p style={{ color: "#e55", marginBottom: 16 }}>
            {error || "No order found."}
          </p>
          <button
            className="home-btn"
            onClick={() =>
              navigate(`/customer/menu?theaterId=${theaterId}&screen=${screen}&seat=${seat}`)
            }
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  /* ── Render ── */

  return (

    <div className="tracking-page">

      <h2>🎬 Order Tracking</h2>

      <div className="tracking-card">

        {/* ORDER ID */}
        <p>
          <strong>Order ID:</strong>{" "}
          <span style={{ fontSize: "12px", wordBreak: "break-all" }}>
            {orderId}
          </span>
        </p>

        {/* SCREEN — from API JSON or localStorage */}
        {(order?.hallId || order?.hallName || order?.screenNo || order?.screenNumber || screen) && (
          <p>
            <strong>Screen:</strong> {order?.hallName || order?.hallId?.name || order?.hallId || order?.screenNumber || order?.screenNo || screen}
          </p>
        )}

        {/* SEAT — from confirmed seatId.seatNumber */}
        {(order?.seatId?.seatNumber || order?.seatNumber || seat) && (
          <p>
            <strong>Seat:</strong> {order?.seatId?.seatNumber || order?.seatNumber || seat}
          </p>
        )}

        {/* TOTAL */}
        {order?.totalAmount && (
          <p>
            <strong>Total:</strong> ₹ {order.totalAmount}
          </p>
        )}

        {/* STATUS */}
        <p>
          <strong>Status:</strong>{" "}
          <span style={{ textTransform: "capitalize" }}>{status}</span>
        </p>

        {/* STEP PROGRESS */}
        <div className="steps">
          {STATUS_FLOW.map((step, index) => (
            <div
              key={step}
              className={`step ${index <= statusIndex ? "active" : ""}`}
            >
              {step}
            </div>
          ))}
        </div>

        {/* ITEMS — from confirmed items[] array */}
        {Array.isArray(order?.items) && order.items.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Items
            </p>
            {order.items.map((item, i) => (
              <div
                key={i}
                style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 13, color: "#555", marginBottom: 4 }}
              >
                <span>{item.name} × {item.quantity}</span>
                { (item.total || item.price) && (
                  <span>₹ {item.total || item.price * item.quantity}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* DELIVERED MESSAGE */}
        {status === "delivered" && (
          <p style={{ marginTop: 15, fontSize: 16, textAlign: "center" }}>
            Enjoy your food 🍿 Redirecting to menu...
          </p>
        )}

        {/* SOFT ERROR */}
        {error && (
          <p style={{ color: "#aaa", fontSize: 12, marginTop: 8 }}>
            ⚠️ {error}
          </p>
        )}

        <button
          className="home-btn"
          onClick={() =>
            navigate(`/customer/menu?theaterId=${theaterId}&screen=${screen}&seat=${seat}`)
          }
        >
          Back to Menu
        </button>

      </div>

    </div>

  );

};

export default OrderTracking;