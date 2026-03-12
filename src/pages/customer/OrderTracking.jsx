import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderTracking.css";

const OrderTracking = () => {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [statusIndex, setStatusIndex] = useState(0);

  const statusFlow = ["Preparing", "Ready", "Delivered"];

  useEffect(() => {
    const savedOrderId = localStorage.getItem("orderId");
    setOrderId(savedOrderId || "No Order Found");

    const interval = setInterval(() => {
      setStatusIndex((prev) => {
        if (prev < statusFlow.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (statusFlow[statusIndex] === "Delivered") {
      setTimeout(() => {
        localStorage.removeItem("orderId");
        navigate("/customer");
      }, 4000);
    }
  }, [statusIndex]);

  return (
    <div className="tracking-page">
      <h2>🎬 Order Tracking</h2>

      <div className="tracking-card">
        <p><strong>Order ID:</strong> {orderId}</p>
        <p><strong>Status:</strong> {statusFlow[statusIndex]}</p>

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
