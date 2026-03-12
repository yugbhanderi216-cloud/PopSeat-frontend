import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./TheaterLayout.css";
import Navbar from "../component/Navbar";

const TheaterLayout = () => {

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className={`layout ${sidebarOpen ? "open" : "closed"}`}>

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>🎬 Theater</h2>
            <span>Management Panel</span>
          </div>

          <nav className="sidebar-links">
            <NavLink to="overview">📊 <span>Overview</span></NavLink>
            <NavLink to="analytics">📈 <span>Analytics</span></NavLink>
            <NavLink to="menu">🍿 <span>Food Menu</span></NavLink>
            <NavLink to="orders">🧾 <span>Orders</span></NavLink>
            <NavLink to="qr">📱 <span>QR Generator</span></NavLink>

            {localStorage.getItem("role") !== "BRANCH" && (
              <NavLink to="settings">⚙️ <span>Settings</span></NavLink>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>

      </div>
    </>
  );
};

export default TheaterLayout;