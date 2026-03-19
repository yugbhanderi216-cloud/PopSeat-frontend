import React, { useEffect, useState } from "react";
import "./WorkerDashboard.css";

const API_BASE = "https://popseat.onrender.com/api";

const WorkerDashboard = () => {
  const [orders, setOrders] = useState([]);

  // 🔐 Get token from localStorage (after login)
  const token = localStorage.getItem("token");

  // 🔄 Fetch orders from API
  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/worker/orders?status=pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  useEffect(() => {
    fetchOrders();

    // auto refresh every 3 sec
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🔁 Update order status
  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(
        `${API_BASE}/worker/order-status/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await res.json();

      if (data.success) {
        fetchOrders(); // refresh list
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  return (
    <div className="worker-page">
      <h1>Live Orders</h1>

      {orders.length === 0 ? (
        <p>No Orders</p>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="worker-card">
            <h3>Order #{order._id}</h3>
            <p>Seat: {order.seatId}</p>
            <p>Status: {order.orderStatus}</p>

            {order.orderStatus === "placed" && (
              <button
                onClick={() =>
                  updateStatus(order._id, "preparing")
                }
              >
                Start Preparing
              </button>
            )}

            {order.orderStatus === "preparing" && (
              <button
                onClick={() =>
                  updateStatus(order._id, "ready")
                }
              >
                Mark Ready
              </button>
            )}

            {order.orderStatus === "ready" && (
              <button
                onClick={() =>
                  updateStatus(order._id, "delivered")
                }
              >
                Mark Delivered
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default WorkerDashboard;