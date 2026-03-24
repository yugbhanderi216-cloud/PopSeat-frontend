import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./TheaterLayout.css";
import Navbar from "../component/Navbar";

const TheaterLayout = () => {

  const navigate = useNavigate();

  // FIX: same triple-key fallback as OwnerHome / TheaterDashboard
  const role = (
    localStorage.getItem("ownerRole")  ||
    localStorage.getItem("workerRole") ||
    localStorage.getItem("role")       || ""
  ).toLowerCase();

  const email = (
    localStorage.getItem("ownerEmail")  ||
    localStorage.getItem("workerEmail") ||
    localStorage.getItem("email")       || ""
  );

  const isWorker = role === "worker";
  const isOwner  = role === "owner";

  // FIX: default sidebar closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth >= 768
  );

  /* ── Auth guard ──
     FIX: no guard existed — anyone could navigate to /theater/*
          without being logged in
  ── */

  useEffect(() => {
    if (!email || (!isOwner && !isWorker)) {
      navigate("/login", { replace: true });
    }
  }, [email, isOwner, isWorker, navigate]);

  /* ── Logout ──
     FIX: was localStorage.clear() — wiped customer session
          now only removes owner/worker keys surgically
  ── */

  const handleLogout = () => {

    const keysToRemove = [
      // Owner keys
      "ownerToken", "ownerEmail", "ownerRole", "ownerPlans",
      "selectedPlan", "activeOwnerTheaterId",
      // Worker keys
      "workerToken", "workerEmail", "workerRole", "assignedTheaterId",
      // Generic fallback keys (only if used by this session)
      "token", "email", "role",
    ];

    keysToRemove.forEach((k) => localStorage.removeItem(k));

    navigate("/login");

  };

  /* ── Nav items ──
     FIX: Analytics and Menu were visible to workers
          Workers should only see Overview, Orders — not
          revenue data or menu management
  ── */

  const ownerLinks = [
    { to: "overview",   icon: "📊", label: "Overview"      },
    { to: "analytics",  icon: "📈", label: "Analytics"     }, // owner only — shows revenue
    { to: "menu",       icon: "🍿", label: "Food Menu"      }, // owner only — can edit items
    { to: "orders",     icon: "🧾", label: "Orders"         },
    { to: "qr",         icon: "📱", label: "QR Generator"   },
    { to: "settings",   icon: "⚙️", label: "Settings"       },
  ];

  const workerLinks = [
    { to: "overview",   icon: "📊", label: "Overview"       },
    { to: "orders",     icon: "🧾", label: "Orders"         }, // worker primary task
  ];

  const navLinks = isWorker ? workerLinks : ownerLinks;

  return (
    <>
      <Navbar toggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className={`layout ${sidebarOpen ? "open" : "closed"}`}>

        {/* ── Sidebar ── */}
        <aside className="sidebar">

          <div className="sidebar-header">
            <h2>🎬 Theater</h2>
            <span>Management Panel</span>
          </div>

          <nav className="sidebar-links">
            {navLinks.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                // Close sidebar on mobile after navigation
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
              >
                {icon} <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Role badge + logout */}
          <div className="sidebar-footer">
            <div className="role-badge">
              {isWorker ? "👷 Worker" : "👑 Owner"}
            </div>
            <button className="sidebar-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>

        </aside>

        {/* ── Main Content ── */}
        <main className="main-content">
          <Outlet />
        </main>

      </div>
    </>
  );

};

export default TheaterLayout;