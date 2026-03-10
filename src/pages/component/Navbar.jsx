import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../PopSeat_Logo.png";

const Navbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();

  const email = localStorage.getItem("loggedInUser");
  const role = localStorage.getItem("role");

  const [open, setOpen] = useState(false);
  const menuRef = useRef();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const getInitial = () => {
    return email ? email.charAt(0).toUpperCase() : "U";
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="navbar">

      {/* LEFT */}
      <div className="nav-left">
        <button className="menu-btn" onClick={toggleSidebar}>☰</button>

        <div className="nav-brand">
          <img src={logo} alt="PopSeat" />
          <span>PopSeat</span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="nav-right" ref={menuRef}>
        <span className="role-chip">{role}</span>

        <div className="profile" onClick={() => setOpen(!open)}>
          <div className="avatar">{getInitial()}</div>
        </div>

        {open && (
          <div className="profile-menu">
            <div className="email">{email}</div>
            <div className="divider"></div>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;