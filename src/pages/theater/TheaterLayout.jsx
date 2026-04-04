import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./TheaterLayout.css";
import logo from "../PopSeat_Logo.png";

// ─────────────────────────────────────────────────────────────
// Theater / Worker layout — mirrors AdminDashboard structure:
//   • Sidebar is sticky (height:100vh, top:0) inside a flex row
//   • Topbar is inside .tl-main — no external Navbar component
//   • Logo click  → toggles sidebar (desktop collapse / mobile drawer)
//   • Mobile      → sidebar becomes a fixed drawer + overlay
//   • Responsive  → bottom-nav shown on ≤768px
// ─────────────────────────────────────────────────────────────

const TheaterLayout = () => {

  const navigate = useNavigate();

  /* ── Read identity ── */
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

  /* ── Auth guard ── */
  useEffect(() => {
    if (!email || (!isOwner && !isWorker)) {
      navigate("/login", { replace: true });
    }
  }, [email, isOwner, isWorker, navigate]);

  /* ── Sidebar state (mirrors AdminDashboard) ── */
  const isMobile = () => window.innerWidth <= 768;

  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userMenuOpen,      setUserMenuOpen]      = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    if (isMobile()) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  /* Close mobile drawer when a nav link is clicked */
  const handleNavClick = () => {
    if (isMobile()) setMobileSidebarOpen(false);
  };

  /* ── Logout ── */
  const handleLogout = () => {
    [
      "ownerToken", "ownerEmail", "ownerRole",
      "ownerPlans", "selectedPlan", "activeOwnerTheaterId",
      "workerToken", "workerEmail", "workerRole", "assignedTheaterId",
      "token", "email", "role",
    ].forEach((k) => localStorage.removeItem(k));
    navigate("/login");
  };

  /* ── Nav items (same rules as before) ── */
  const ownerLinks = [
    { to: "overview",  icon: "⬡", label: "Overview"           },
    { to: "orders",    icon: "◎", label: "Orders"             },
    { to: "analytics", icon: "◈", label: "Analytics"          },
    { to: "menu",      icon: "☷", label: "Food Menu"          },
    { to: "qr",        icon: "▣", label: "QR Generator"       },
    { to: "settings",  icon: "⬢", label: "Settings"           },
  ];

  const workerLinks = [
    { to: "overview",  icon: "⬡", label: "Overview"  },
    { to: "orders",    icon: "◎", label: "Orders"    },
    { to: "analytics", icon: "◈", label: "Analytics" },
    { to: "menu",      icon: "☷", label: "Food Menu" },
    { to: "qr",        icon: "▣", label: "QR Code"   },
  ];

  const navLinks = isWorker ? workerLinks : ownerLinks;

  /* ── Root class string ── */
  const rootClass = [
    "tl-root",
    sidebarCollapsed  ? "sidebar-collapsed"   : "",
    mobileSidebarOpen ? "mobile-sidebar-open" : "",
  ].filter(Boolean).join(" ");

  const getInitial = () => email ? email.charAt(0).toUpperCase() : "U";

  return (
    <div className={rootClass}>

      {/* Mobile dim overlay — tap to close sidebar */}
      <div className="tl-overlay" onClick={closeMobileSidebar} />

      {/* ══ SIDEBAR ══ */}
      <aside className="tl-sidebar">

        {/* Logo row — click to toggle sidebar */}
        <div className="tl-brand" onClick={toggleSidebar} title="Toggle sidebar">
          <img src={logo} alt="PopSeat" />
          <span>PopSeat</span>
        </div>

        <div className="tl-sidebar-label">
          {isWorker ? "WORKER PANEL" : "THEATER PANEL"}
        </div>

        {/* Nav links */}
        <nav className="tl-nav">
          {navLinks.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `tl-nav-btn${isActive ? " active" : ""}`}
              onClick={handleNavClick}
            >
              <span className="tl-nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="tl-sidebar-footer">
          <div className="tl-user-info">
            <div className="tl-avatar">{getInitial()}</div>
            <div className="tl-user-text">
              <div className="tl-user-role">
                {isWorker ? "Worker" : "Owner"}
              </div>
              <div className="tl-user-email">{email}</div>
            </div>
          </div>
          <button className="tl-logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>

      </aside>

      {/* ══ MAIN ══ */}
      <main className="tl-main">

        {/* Fixed topbar */}
        <div className="tl-topbar">
          <div className="tl-topbar-left">
            {/* Hamburger + brand - hidden when sidebar open, shown when sidebar collapsed */}
            <button
              className="tl-menu-toggle"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div className="tl-brand-inline">
              <img src={logo} alt="PopSeat" />
              <span>PopSeat</span>
            </div>
          </div>
          <div className="tl-topbar-right" ref={userMenuRef}>
            <span className="tl-role-chip">
              {isOwner ? "👑 Owner" : "👷 Worker"}
            </span>

            <div
              className="tl-avatar-sm"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              title="User menu"
            >
              {getInitial()}
            </div>

            {userMenuOpen && (
              <div className="tl-user-dropdown">
                <div className="tl-dropdown-info">
                  <span className="tl-header-email">{email}</span>
                </div>
                <div className="tl-dropdown-divider" />
                <button className="tl-dropdown-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="tl-content">
          <Outlet />
        </div>

      </main>

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="tl-bottom-nav">
        <div className="tl-bottom-nav-inner">
          {navLinks.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `tl-bnav-btn${isActive ? " active" : ""}`
              }
              onClick={handleNavClick}
            >
              <span className="tl-bnav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );

};

export default TheaterLayout;