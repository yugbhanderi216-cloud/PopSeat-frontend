import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderTracking.css";

const API_BASE = "https://popseat.onrender.com/api";

// Order progresses through these steps in sequence
const STATUS_STEPS = ["placed", "preparing", "ready", "delivered"];

// ─────────────────────────────────────────────────────────────
//  OrderSuccess — Customer-facing order tracking page.
//
//  Polls GET /api/order/:id every 5 s using the customer token.
//  Stops polling once the order is delivered.
//
//  NOTE FOR BACKEND TEAM:
//    Requires GET /api/order/:id to be implemented (Section 1.6).
//    The endpoint must:
//      • Accept Authorization: Bearer <token>
//      • Return { success: true, order: { _id, orderStatus, items, ... } }
//      • Return 404 { success: false, message: "Order not found" } if not found
// ─────────────────────────────────────────────────────────────

const OrderSuccess = () => {
  const navigate = useNavigate();

  // ── Read state from localStorage (set by CustomerCart before redirect) ──
  const orderId   = localStorage.getItem("currentOrderId");
  const token     = localStorage.getItem("token");
  const theaterId = localStorage.getItem("theaterId") || "";
  const hallId    = localStorage.getItem("hallId") || "";
  const seatId    = localStorage.getItem("seatId") || "";

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Keep a stable ref to the latest order so the interval closure
  // can read it without causing the effect to re-run
  const orderRef = useRef(null);
  orderRef.current = order;

  // ─────────────────────────────────────────────────────────
  //  FETCH — calls GET /api/order/:id with customer token
  // ─────────────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError("No order ID found. Please place an order first.");
      setLoading(false);
      return;
    }

    const sessionId = localStorage.getItem("sessionId");
    
    if (!token && !sessionId) {
      setError("Session expired. Please scan your seat QR to continue.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/order/${orderId}`, {
        headers: {
          "Content-Type":  "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
          ...(sessionId && { "session-id": sessionId }),
        },
      });

      // ── 404: order not found ──────────────────────────────
      if (res.status === 404) {
        // Only show error if we have never loaded the order;
        // if we already have order state, keep showing it
        if (!orderRef.current) {
          setError("Order not found. It may have already been delivered.");
        }
        setLoading(false);
        return;
      }

      // ── 401 / 403: auth failure ───────────────────────────
      if (res.status === 401 || res.status === 403) {
        setError("Session expired. Please scan your seat QR to continue.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.success && data.order) {
        setOrder(data.order);
        setError("");
      } else {
        if (!orderRef.current) {
          setError(data.message || "Could not fetch order status.");
        }
      }
    } catch (err) {
      console.error("Order fetch error:", err);
      // Network blip — keep showing last known order state
      if (!orderRef.current) {
        setError("Network error. Retrying…");
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  // ─────────────────────────────────────────────────────────
  //  POLLING — every 5 s; stops once delivered
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchOrder();

    const interval = setInterval(() => {
      // Stop polling once the order is delivered — no need to keep
      // hitting the server after the final state is reached
      if (orderRef.current?.orderStatus === "delivered") {
        clearInterval(interval);
        return;
      }
      fetchOrder();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchOrder]);

  // ─────────────────────────────────────────────────────────
  //  NAVIGATION
  const handleBackToMenu = () => {
    navigate(
      `/customer/menu?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}`
    );
  };

  // ─────────────────────────────────────────────────────────
  //  LOADING STATE
  // ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="tracking-page">
        <div className="tracking-card">
          <h2>🎬 Order Tracking</h2>
          <p>Fetching your order…</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  //  ERROR STATE (no order loaded yet)
  // ─────────────────────────────────────────────────────────
  if (error && !order) {
    return (
      <div className="tracking-page">
        <div className="tracking-card">
          <h2>🎬 Order Tracking</h2>
          <p style={{ color: "#e55", marginBottom: 16 }}>{error}</p>
          <button className="home-btn" onClick={handleBackToMenu}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  //  MAIN RENDER
  // ─────────────────────────────────────────────────────────
  const status      = order?.orderStatus || "placed";
  const statusIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="tracking-page">
      <div className="tracking-card">

        <h2>🎬 Order Tracking</h2>

        <p>
          <strong>Order ID:</strong>{" "}
          <span style={{ fontSize: "12px", wordBreak: "break-all" }}>
            {order._id}
          </span>
        </p>

        <p>
          <strong>Status:</strong>{" "}
          <span style={{ textTransform: "capitalize" }}>{status}</span>
        </p>

        {/* ── Step progress bar ── */}
        <div className="steps">
          {STATUS_STEPS.map((step, i) => (
            <div
              key={step}
              className={`step ${statusIndex >= i ? "active" : ""}`}
            >
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </div>
          ))}
        </div>

        {status === "delivered" && (
          <p style={{ marginTop: "15px", fontSize: "18px" }}>
            Enjoy your food 🍿
          </p>
        )}

        {/* Soft error shown without hiding order (e.g. network blip) */}
        {error && order && (
          <p style={{ color: "#aaa", fontSize: "12px", marginTop: 8 }}>
            ⚠️ {error}
          </p>
        )}

        <button className="home-btn" onClick={handleBackToMenu}>
          Back to Menu
        </button>

      </div>
    </div>
  );
};

export default OrderSuccess;
