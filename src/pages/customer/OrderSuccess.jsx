import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderTracking.css";

const API_BASE = "https://popseat.onrender.com/api";

const Tracking = () => {

  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  const orderId = localStorage.getItem("orderId");

  /* ===============================
     FETCH ORDER FROM API
  =============================== */

  const fetchOrder = async () => {

    try {

      const res = await fetch(
        `${API_BASE}/worker/orders?status=pending`
      );

      const data = await res.json();

      if (data.success) {

        const found = data.orders.find(
          (o) => String(o._id) === String(orderId)
        );

        if (found) {
          setOrder(found);
        }

      }

    } catch (error) {
      console.error("Order fetch error:", error);
    }

  };

  useEffect(() => {

    fetchOrder();

    /* refresh every 5 seconds */
    const interval = setInterval(fetchOrder, 5000);

    return () => clearInterval(interval);

  }, []);

  if (!order) {
    return (
      <div className="tracking-page">
        <div className="tracking-card">

          <h2>🎬 Order Tracking</h2>

          <p>No Order Found</p>

          <button
            className="home-btn"
            onClick={() => navigate("/customer/menu")}
          >
            Back to Menu
          </button>

        </div>
      </div>
    );
  }

  const status = order.orderStatus || "placed";

  return (
    <div className="tracking-page">

      <div className="tracking-card">

        <h2>🎬 Order Tracking</h2>

        <p>
          <strong>Order ID:</strong> {order._id}
        </p>

        <p>
          <strong>Status:</strong> {status}
        </p>

        <div className="steps">

          <div
            className={`step ${
              ["placed","preparing","ready","delivered"].includes(status)
                ? "active"
                : ""
            }`}
          >
            Preparing
          </div>

          <div
            className={`step ${
              ["ready","delivered"].includes(status)
                ? "active"
                : ""
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
          <p style={{ marginTop: "15px" }}>
            Enjoy your food 🍿
          </p>
        )}

        <button
          className="home-btn"
          onClick={() => navigate("/customer/menu")}
        >
          Back to Home
        </button>

      </div>

    </div>
  );
};

export default Tracking;