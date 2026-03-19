import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";
import logo from "../PopSeat_Logo.png";

const AdminLogin = () => {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");

  const API_BASE = "https://popseat.onrender.com";

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password
        })
      });

      if (!response.ok) {
        throw new Error("Server not responding");
      }

      const data = await response.json();

      if (data.success) {

        // ✅ Store token
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", "admin");
        localStorage.setItem("isAuth", "true");
        localStorage.setItem("email", form.email);

        // ✅ Redirect
        navigate("/admin-dashboard");

      } else {
        setError(data.message || "Invalid credentials");
      }

    } catch (err) {
      console.error(err);
      setError("Server error. Try again.");
    }
  };

  return (
    <div className="admin-wrapper">

      {/* Background Orbs */}
      <div className="orb orb1"></div>
      <div className="orb orb2"></div>

      <div className="admin-card">

        {/* BRAND */}
        <div className="login-brand">
          <img src={logo} alt="PopSeat Logo" />
          <span>PopSeat</span>
        </div>

        <h2>Admin Portal</h2>
        <p className="tag">Authorized Secure Access</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleLogin}>

          <div className="input-box">
            <span className="icon">📧</span>
            <input
              type="email"
              placeholder="Enter Admin Email"
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

export default AdminLogin;