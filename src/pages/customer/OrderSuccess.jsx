import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderTracking.css";

const Tracking = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const id = localStorage.getItem("orderId");

    const orders = JSON.parse(localStorage.getItem("orders")) || [];

    const found = orders.find((o) => String(o.id) === String(id));

    if (found) {
      setOrder(found);
    }
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

  return (
    <div className="tracking-page">
      <div className="tracking-card">

        <h2>🎬 Order Tracking</h2>

        <p>
          <strong>Order ID:</strong> {order.id}
        </p>

        <p>
          <strong>Status:</strong> {order.status}
        </p>

        <div className="steps">

          <div
            className={`step ${
              ["Preparing", "Ready", "Delivered"].includes(order.status)
                ? "active"
                : ""
            }`}
          >
            Preparing
          </div>

          <div
            className={`step ${
              ["Ready", "Delivered"].includes(order.status)
                ? "active"
                : ""
            }`}
          >
            Ready
          </div>

          <div
            className={`step ${
              order.status === "Delivered" ? "active" : ""
            }`}
          >
            Delivered
          </div>

        </div>

        {order.status === "Delivered" && (
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