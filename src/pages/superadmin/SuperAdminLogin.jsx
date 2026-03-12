import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SuperAdminLogin.css";
import logo from "../PopSeat_Logo.png";

const SuperAdminLogin = () => {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");

  const SUPER_ADMIN = {
    email: "yugbhanderi216@gmail.com",
    password: "777777777"
  };

  const handleLogin = (e) => {
    e.preventDefault();

    if (
      form.email === SUPER_ADMIN.email &&
      form.password === SUPER_ADMIN.password
    ) {
      localStorage.setItem("role", "superadmin");
      localStorage.setItem("loggedInUser", form.email);
      navigate("/superadmin-dashboard");
    } else {
      setError("Access Denied — Invalid Credentials");
    }
  };

  return (
    <div className="superadmin-wrapper">

      {/* Background Orbs */}
      <div className="orb orb1"></div>
      <div className="orb orb2"></div>

      <div className="superadmin-card">

        {/* CLEAN BRAND */}
        <div className="login-brand">
          <img src={logo} alt="PopSeat Logo" />
          <span>PopSeat</span>
        </div>

        <h2>Super Admin Portal</h2>
        <p className="tag">Authorized Secure Access</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleLogin}>

          <div className="input-box">
            <span className="icon">📧</span>
            <input
              type="email"
              placeholder="Enter Super Admin Email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              required
            />
          </div>

          <div className="input-box">
            <span className="icon">🔒</span>
            <input
              type="password"
              placeholder="Enter Password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              required
            />
          </div>

          <button type="submit" className="login-btn">
            Access Dashboard
          </button>

        </form>

      </div>

    </div>
  );
};

export default SuperAdminLogin;