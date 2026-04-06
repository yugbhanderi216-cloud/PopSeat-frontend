import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../PopSeat_Logo.png";

// ─────────────────────────────────────────────────────────────
// Navbar is used inside TheaterLayout only.
// Users here are OWNER or WORKER exclusively.
// Email + role are already in localStorage from login —
// no API call needed at all.
// ─────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  owner  : { label: "👑 Owner",  color: "#b5633c" },
  worker : { label: "👷 Worker", color: "#3B82F6" },
};

const Navbar = ({ toggleSidebar }) => {

  const navigate = useNavigate();

  // Read directly from localStorage — set at login, always available
  // FIX: triple-key fallback consistent with all other files
  const [email] = useState(() => localStorage.getItem("email") || "");

  const [role] = useState(() => (localStorage.getItem("role") || "").toLowerCase());

  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  /* ── Close dropdown on outside click ── */

  useEffect(() => {

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  /* ── Logout — surgical key removal only ── */

  const handleLogout = () => {
    [
      "token", "email", "role", "theaterId", "theaterName", "branchName",
      "sessionToken", "seatId", "hallId", "cart"
    ].forEach((k) => localStorage.removeItem(k));
    navigate("/login");
  };

  const roleConfig = ROLE_CONFIG[role] || { label: role || "User", color: "#888" };

  const getInitial = () => email ? email.charAt(0).toUpperCase() : "U";

  return (

    <header className="navbar">

      {/* LEFT */}
      <div className="nav-left">

        <button className="menu-btn" onClick={toggleSidebar}>
          ☰
        </button>

        <div className="nav-brand">
          <img src={logo} alt="PopSeat" />
          <span>PopSeat</span>
        </div>

      </div>

      {/* RIGHT */}
      <div className="nav-right" ref={menuRef}>

        {/* Role chip — color coded per role */}
        <span
          className="role-chip"
          style={{
            background : `${roleConfig.color}18`,
            color      : roleConfig.color,
            border     : `1px solid ${roleConfig.color}40`,
          }}
        >
          {roleConfig.label}
        </span>

        {/* Avatar */}
        <div className="profile" onClick={() => setOpen(!open)}>
          <div
            className="avatar"
            style={{ background: roleConfig.color }}
          >
            {getInitial()}
          </div>
        </div>

        {/* Dropdown */}
        {open && (

          <div className="profile-menu">

            <div className="email" style={{ fontSize: 12, color: "#888" }}>
              {email || "No email"}
            </div>

            <div className="divider" />

            <button onClick={handleLogout}>
              Logout
            </button>

          </div>

        )}

      </div>

    </header>

  );

};

export default Navbar;
