import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./Orders.css";
const Orders = () => {
  const { state } = useLocation();
  const [orders, setOrders] = useState([]);
  const [newOrderIds, setNewOrderIds] = useState([]);
  const [screenFilter, setScreenFilter] = useState("");
  const [seatFilter, setSeatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const loggedEmail = localStorage.getItem("loggedInUser");
  const role = localStorage.getItem("role");
  const [theaterId, setTheaterId] = useState(null);
  const previousOrdersRef = useRef([]);
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };
  useEffect(() => {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    let detectedId = null;
    if (role === "BRANCH") {
      const branchUser = users.find((u) => u.email === loggedEmail);
      detectedId = branchUser?.theaterId;
    }
    if (role === "OWNER") {
      detectedId = state?.theaterId || localStorage.getItem("currentTheaterId");
    }
    if (detectedId) {
      setTheaterId(Number(detectedId));
    }
  }, [loggedEmail, role, state]);
  useEffect(() => {
    if (!theaterId) return;
    const loadOrders = () => {
      const allOrders = JSON.parse(localStorage.getItem("orders")) || [];
      const today = getTodayDate();
      const todayOrders = allOrders.filter((o) => {
        const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
        return (Number(o.theaterId) === Number(theaterId) && orderDate === today);
      });
      const newOnes = todayOrders.filter((o) => !previousOrdersRef.current.some((p) => p.id === o.id));
      if (newOnes.length > 0) {
        setNewOrderIds(newOnes.map((o) => o.id));
        setTimeout(() => setNewOrderIds([]), 4000);
      }
      previousOrdersRef.current = todayOrders;
      setOrders(todayOrders);
    };
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [theaterId]);
  const updateStatus = (id, newStatus) => {
    const allOrders = JSON.parse(localStorage.getItem("orders")) || [];
    const updatedOrders = allOrders.map((order) => order.id === id ? { ...order, status: newStatus } : order);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    setOrders(updatedOrders.filter((o) => Number(o.theaterId) === Number(theaterId) && new Date(o.createdAt).toISOString().split("T")[0] === getTodayDate()));
  };
  const filteredOrders = orders.filter((order) => {
    return ((screenFilter === "" || String(order.screenNo).includes(screenFilter)) && (seatFilter === "" || String(order.seatNo).includes(seatFilter)) && (statusFilter === "" || order.status === statusFilter));
  });
  return (
    <div className="orders-container">
      <h2>📦 Today’s Orders</h2>
      <div className="filter-bar">
        <input placeholder="Screen" value={screenFilter} onChange={(e) => setScreenFilter(e.target.value)} />
        <input placeholder="Seat" value={seatFilter} onChange={(e) => setSeatFilter(e.target.value.toUpperCase())} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="Preparing">Preparing</option>
          <option value="Ready">Ready</option>
          <option value="Delivered">Delivered</option>
        </select>
        <button onClick={() => { setScreenFilter(""); setSeatFilter(""); setStatusFilter(""); }}>
          Clear
        </button>
      </div>
      {filteredOrders.length === 0 ? (
        <p>No Orders For Today</p>
      ) : (
        filteredOrders.map((order) => (
          <div key={order.id} className={`order-card ${newOrderIds.includes(order.id) ? "new-order" : ""}`}>
            <div className="order-info">
              <strong>Order #{order.id}</strong>
              <p><b>Screen:</b> {order.screenNo}</p>
              <p><b>Seat:</b> {order.seatNo || "N/A"}</p>
              <p><b>Total:</b> ₹ {order.total}</p>
              <p><b>Status:</b> {order.status}</p>
              <p><b>Time:</b> {order.createdAt}</p>
              <div className="items-list">
                {order.items.map((item) => (
                  <p key={item.id}>• {item.name} × {item.quantity}</p>
                ))}
              </div>
            </div>
            <div className="order-actions">
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
          </div>
        ))
      )}
    </div>
  );
};
export default Orders;