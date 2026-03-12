import React, { useEffect, useState } from "react";
import "./WorkerDashboard.css";

const WorkerDashboard = () => {
  const [orders, setOrders] = useState([]);

  const email = localStorage.getItem("loggedInUser");

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const currentUser = users.find((u) => u.email === email);

  const assignedTheater = currentUser?.assignedTheater;

  useEffect(() => {
    const loadOrders = () => {
      const storedOrders =
        JSON.parse(localStorage.getItem("orders")) || [];

      // ⭐ Only show this theater's orders
      const filtered = storedOrders.filter(
        (o) => o.theaterEmail === assignedTheater
      );

      setOrders(filtered);
    };

    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [assignedTheater]);

  const updateStatus = (id, status) => {
    const stored =
      JSON.parse(localStorage.getItem("orders")) || [];

    const updated = stored.map((o) =>
      o.id === id ? { ...o, status } : o
    );

    localStorage.setItem("orders", JSON.stringify(updated));
    setOrders(updated.filter((o) => o.theaterEmail === assignedTheater));
  };

  return (
    <div className="worker-page">
      <h1>Live Orders</h1>

      {orders.length === 0 ? (
        <p>No Orders</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="worker-card">
            <h3>Order #{order.id}</h3>
            <p>Screen: {order.screenNo}</p>
            <p>Seat: {order.seatNo}</p>
            <p>Status: {order.status}</p>

            {order.status === "Preparing" && (
              <button onClick={() => updateStatus(order.id, "Ready")}>
                Mark Ready
              </button>
            )}

            {order.status === "Ready" && (
              <button onClick={() => updateStatus(order.id, "Delivered")}>
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
