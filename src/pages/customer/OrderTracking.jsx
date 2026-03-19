import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderTracking.css";

const API_BASE = "https://popseat.onrender.com/api";

const OrderTracking = () => {

  const navigate = useNavigate();

  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("placed");

  const statusFlow = ["placed", "preparing", "ready", "delivered"];

  /* ===============================
     LOAD ORDER ID
  =============================== */

  useEffect(() => {

    const savedOrderId = localStorage.getItem("orderId");

    if (savedOrderId) {
      setOrderId(savedOrderId);
    }

  }, []);

  /* ===============================
     FETCH ORDER STATUS FROM API
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
          setStatus(found.orderStatus);
        }

      }

    } catch (err) {
      console.error("Order fetch error:", err);
    }

  };

  useEffect(() => {

    if (!orderId) return;

    fetchOrder();

    const interval = setInterval(fetchOrder, 5000);

    return () => clearInterval(interval);

  }, [orderId]);

  /* ===============================
     REDIRECT AFTER DELIVERY
  =============================== */

  useEffect(() => {

    if (status === "delivered") {

      setTimeout(() => {

        localStorage.removeItem("orderId");
        navigate("/customer");

      }, 4000);

    }

  }, [status]);

  const statusIndex = statusFlow.indexOf(status);

  return (

    <div className="tracking-page">

      <h2>🎬 Order Tracking</h2>

      <div className="tracking-card">

        <p>
          <strong>Order ID:</strong> {orderId || "No Order"}
        </p>

        <p>
          <strong>Status:</strong> {status}
        </p>

        <div className="steps">

          {statusFlow.map((step, index) => (

            <div
              key={index}
              className={`step ${
                index <= statusIndex ? "active" : ""
              }`}
            >
              {step}
            </div>

          ))}

        </div>

        <button
          className="home-btn"
          onClick={() => navigate("/customer")}
        >
          Back to Home
        </button>

      </div>

    </div>

  );

};

export default OrderTracking;