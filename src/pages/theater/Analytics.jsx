import React, { useEffect, useState } from "react";
import "./Analytics.css";

const Analytics = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("today");

  useEffect(() => {
    const allOrders =
      JSON.parse(localStorage.getItem("orders")) || [];
    setOrders(allOrders);
  }, []);

  // 📅 Filter Orders by Time
  const now = new Date();

  const filteredOrders = orders.filter((order) => {
    const orderDate = new Date(order.createdAt);

    if (filter === "today") {
      return orderDate.toDateString() === now.toDateString();
    }

    if (filter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return orderDate >= weekAgo;
    }

    if (filter === "month") {
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }

    if (filter === "year") {
      return orderDate.getFullYear() === now.getFullYear();
    }

    return true;
  });

  // 📊 Stats Based on Filtered Orders
  const totalOrders = filteredOrders.length;

  const totalRevenue = filteredOrders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );

  const preparing = filteredOrders.filter(
    (o) => o.status === "Preparing"
  ).length;

  const ready = filteredOrders.filter(
    (o) => o.status === "Ready"
  ).length;

  const delivered = filteredOrders.filter(
    (o) => o.status === "Delivered"
  ).length;

  // 🍿 Top Selling Items
  const itemMap = {};
  filteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      itemMap[item.name] =
        (itemMap[item.name] || 0) + item.quantity;
    });
  });

  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="analytics-container">
      <h2>📊 Theater Analytics</h2>

      {/* ⏱ Filter Buttons */}
      <div className="filter-buttons">
        <button onClick={() => setFilter("today")}>Today</button>
        <button onClick={() => setFilter("week")}>Weekly</button>
        <button onClick={() => setFilter("month")}>Monthly</button>
        <button onClick={() => setFilter("year")}>Yearly</button>
      </div>

      {/* Summary Cards */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Total Orders</h3>
          <p>{totalOrders}</p>
        </div>

        <div className="analytics-card">
          <h3>Total Revenue</h3>
          <p>₹ {totalRevenue}</p>
        </div>

        <div className="analytics-card">
          <h3>Preparing</h3>
          <p>{preparing}</p>
        </div>

        <div className="analytics-card">
          <h3>Delivered</h3>
          <p>{delivered}</p>
        </div>
      </div>

      {/* Top Items */}
      <div className="top-items">
        <h3>🔥 Top Selling Items</h3>

        {topItems.length === 0 ? (
          <p>No data available</p>
        ) : (
          topItems.map(([name, qty]) => (
            <div key={name} className="top-item">
              <span>{name}</span>
              <strong>{qty} sold</strong>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Analytics;
