import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderTracking.css";

const API_BASE = "https://popseat.onrender.com/api";

// ─────────────────────────────────────────────────────────────
// ⚠️  MISSING API NOTE (for backend team):
//     A customer-facing GET /api/order/:id endpoint is needed.
//     Currently using GET /api/worker/orders?status=pending
//     as a temporary workaround — this exposes ALL pending
//     orders to the client and requires a worker token.
//     Replace the fetchOrder function below once the endpoint
//     is available.
// ─────────────────────────────────────────────────────────────

const STATUS_STEPS = ["placed", "preparing", "ready", "delivered"];

const Tracking = () => {

  const navigate = useNavigate();

  // FIX: was "orderId" — CustomerCart saves as "currentOrderId"
  const orderId   = localStorage.getItem("currentOrderId");
  const token     = localStorage.getItem("customerToken");

  // Restore nav params so "Back to Menu" works correctly
  const theaterId = localStorage.getItem("customerTheaterId") || "";
  const screen    = localStorage.getItem("screenNo")          || "";
  const seat      = localStorage.getItem("seatNo")            || "";

  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  /* ===============================
     FETCH ORDER
     ⚠️  Temporary: polling worker endpoint until
         GET /api/order/:id is available
  =============================== */

  const fetchOrder = useCallback(async () => {

    if (!orderId) {
      setError("No order ID found. Please place an order first.");
      setLoading(false);
      return;
    }

    try {

      // ⚠️  WORKAROUND: worker endpoint — swap URL when
      //     GET /api/order/:orderId is added to the API
      const res = await fetch(
        `${API_BASE}/worker/orders?status=pending`,
        {
          headers: {
            "Content-Type" : "application/json",
            // FIX: auth header was missing — worker endpoint requires token
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      const data = await res.json();

      if (data.success) {

        const found = data.orders.find(
          (o) => String(o._id) === String(orderId)
        );

        if (found) {
          setOrder(found);
          setError("");
        } else {
          // Order may have moved out of "pending" — check all statuses
          // by also searching delivered/ready (needs API support)
          // For now keep last known order state if already loaded
          if (!order) {
            setError("Order not found. It may have already been delivered.");
          }
        }

      } else {
        setError("Could not fetch order status.");
      }

    } catch (err) {
      console.error("Order fetch error:", err);
      // Don't clear existing order on network blip — keep showing last state
      if (!order) {
        setError("Network error. Retrying...");
      }
    } finally {
      setLoading(false);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, token]);

  useEffect(() => {

    fetchOrder();

    // Stop polling once delivered — no need to keep hitting the server
    if (order?.orderStatus === "delivered") return;

    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);

  }, [fetchOrder, order?.orderStatus]);

  /* ===============================
     BACK TO MENU — with params restored
  =============================== */

  const handleBackToMenu = () => {
    navigate(
      `/customer/menu?theaterId=${theaterId}&screen=${screen}&seat=${seat}`
    );
  };

  /* ===============================
     LOADING STATE
  =============================== */

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

  /* ===============================
     ERROR / NOT FOUND STATE
  =============================== */

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

  /* ===============================
     RENDER ORDER
  =============================== */

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

        {/* STEP PROGRESS */}

        <div className="steps">

          <div
            className={`step ${
              statusIndex >= STATUS_STEPS.indexOf("placed") ? "active" : ""
            }`}
          >
            Placed
          </div>

          <div
            className={`step ${
              statusIndex >= STATUS_STEPS.indexOf("preparing") ? "active" : ""
            }`}
          >
            Preparing
          </div>

          <div
            className={`step ${
              statusIndex >= STATUS_STEPS.indexOf("ready") ? "active" : ""
            }`}
          >
            Ready
          </div>

          <div
            className={`step ${
              status === "delivered" ? "active" : ""
            }`}
          >
            Delivered
          </div>

        </div>

        {status === "delivered" && (
          <p style={{ marginTop: "15px", fontSize: "18px" }}>
            Enjoy your food 🍿
          </p>
        )}

        {/* Show soft error (network blip) without hiding order */}
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

export default Tracking;