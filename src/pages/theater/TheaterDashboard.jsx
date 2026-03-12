import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TheaterDashboard.css";

/* ===============================
   TIME FORMATTER (24hr → 12hr)
================================ */
const formatTime = (time) => {
  if (!time) return "";

  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${ampm}`;
};

const TheaterDashboard = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const loggedEmail = localStorage.getItem("loggedInUser");
  const role = localStorage.getItem("role");

  if (!loggedEmail || !role) {
    navigate("/login");
    return null;
  }

  let theaters = JSON.parse(localStorage.getItem("theaters")) || [];
  if (!Array.isArray(theaters)) {
    theaters = Object.values(theaters);
    localStorage.setItem("theaters", JSON.stringify(theaters));
  }

  const orders = JSON.parse(localStorage.getItem("orders")) || [];

  let theaterData = null;

  /* BRANCH FLOW */
  if (role === "BRANCH") {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const branchUser = users.find((u) => u.email === loggedEmail);

    if (!branchUser) {
      navigate("/login");
      return null;
    }

    localStorage.setItem("branchTheaterId", branchUser.theaterId);
    theaterData = theaters.find((t) => t.id === branchUser.theaterId);
  }

  /* OWNER FLOW */
  if (role === "OWNER") {
    let theaterId =
      state?.theaterId || localStorage.getItem("activeOwnerTheaterId");

    if (theaterId) {
      theaterId = Number(theaterId);
      localStorage.setItem("activeOwnerTheaterId", theaterId);
      theaterData = theaters.find((t) => t.id === theaterId);
    }
  }

  if (!theaterData) {
    return (
      <div className="dashboard-empty">
        <h2>Theater Not Found</h2>
      </div>
    );
  }

  const currentTheaterId = theaterData.id;

  const theaterOrders = orders.filter(
    (order) => order.theaterId === currentTheaterId
  );

  const ordersToday = theaterOrders.length;

  const revenueToday = theaterOrders.reduce(
    (total, order) => total + (order.total || 0),
    0
  );

  const preparingOrders = theaterOrders.filter(
    (order) => order.status === "Preparing"
  ).length;

  const readyOrders = theaterOrders.filter(
    (order) => order.status === "Ready"
  ).length;

  const deliveredOrders = theaterOrders.filter(
    (order) => order.status === "Delivered"
  ).length;

  return (
    <div className="dashboard-container">

      {/* 🔥 NEW BANNER SECTION (ADDED) */}
      <div
        className="dashboard-banner"
        style={{
          backgroundImage: theaterData.banner
            ? `url(${theaterData.banner})`
            : "linear-gradient(135deg,#111827,#1f2937)"
        }}
      >
        <div className="banner-overlay">
          {theaterData.logo && (
            <img
              src={theaterData.logo}
              alt="Theater Logo"
              className="dashboard-logo"
            />
          )}
          <h1>{theaterData.theaterName}</h1>
          <p>
            {theaterData.branch} • {theaterData.location}
          </p>
        </div>
      </div>

      {/* STATS (UNCHANGED) */}
      <div className="dashboard-stats">
        <div className="stat-box">
          📦 Orders Today
          <strong>{ordersToday}</strong>
        </div>

        <div className="stat-box">
          💰 Revenue
          <strong>₹ {revenueToday}</strong>
        </div>

        <div className="stat-box">
          🍳 Preparing
          <strong>{preparingOrders}</strong>
        </div>

        <div className="stat-box">
          🟢 Ready
          <strong>{readyOrders}</strong>
        </div>

        <div className="stat-box">
          ✅ Delivered
          <strong>{deliveredOrders}</strong>
        </div>
      </div>

      {/* WORKING HOURS (UNCHANGED) */}
      <div className="dashboard-info">
        <div className="info-card">
          <h3>Working Hours</h3>
          <p>
            {formatTime(theaterData.openingTime)} –{" "}
            {formatTime(theaterData.closingTime)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TheaterDashboard;