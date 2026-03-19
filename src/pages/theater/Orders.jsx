import React, { useState, useEffect } from "react";
import "./Orders.css";

const Orders = () => {

  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  const token = localStorage.getItem("token");

  const fetchOrders = async () => {
    try {

      const res = await fetch(
        "http://localhost:5000/api/worker/orders",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      setOrders(data);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 5000);

    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, status) => {
    try {

      await fetch(
        `http://localhost:5000/api/worker/order-status/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      fetchOrders();

    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter((o) =>
    statusFilter === "" ? true : o.status === statusFilter
  );

  return (
    <div className="orders-container">

      <h2>📦 Orders</h2>

      <div className="filter-bar">

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Preparing">Preparing</option>
          <option value="Ready">Ready</option>
          <option value="Delivered">Delivered</option>
        </select>

      </div>

      {filteredOrders.length === 0 ? (
        <p>No Orders</p>
      ) : (
        filteredOrders.map((order) => (
          <div key={order._id} className="order-card">

            <div className="order-info">

              <strong>Order #{order._id}</strong>

              <p>
                <b>Seat:</b> {order.seatId?.seatNumber}
              </p>

              <p>
                <b>Total:</b> ₹ {order.totalAmount}
              </p>

              <p>
                <b>Status:</b> {order.status}
              </p>

              <div className="items-list">

                {order.items.map((item, i) => (
                  <p key={i}>
                    • {item.name} × {item.quantity}
                  </p>
                ))}

              </div>

            </div>

            <div className="order-actions">

              {order.status === "Preparing" && (
                <button
                  onClick={() =>
                    updateStatus(order._id, "Ready")
                  }
                >
                  Mark Ready
                </button>
              )}

              {order.status === "Ready" && (
                <button
                  onClick={() =>
                    updateStatus(order._id, "Delivered")
                  }
                >
                  Mark Delivered
                </button>
              )}

            </div>

          </div>
        ))
      )}

    </div>
  );
};

export default Orders;