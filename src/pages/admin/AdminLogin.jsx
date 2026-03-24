import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";
import logo from "../PopSeat_Logo.png";

const API_BASE = "https://popseat.onrender.com";

const AdminLogin = () => {

  const navigate = useNavigate();

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  /* ── Input change — clears stale error ── */

  const handleChange = (e) => {
    setError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ===============================
     LOGIN — POST /api/admin/login ✅
  =============================== */

  const handleLogin = async (e) => {

    e.preventDefault();
    setError("");
    setLoading(true);

    try {

      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          email    : form.email,
          password : form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid credentials. Please try again.");
        return;
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("token",      data.token);
      localStorage.setItem("adminEmail", form.email);
      localStorage.setItem("email",      form.email);
      localStorage.setItem("adminRole",  "admin");
      localStorage.setItem("role",       "admin");

      navigate("/admin-dashboard");

    } catch (err) {
      console.error("Admin login error:", err);
      setError("Server error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }

  };

  return (

    <div className="admin-wrapper">

      <div className="orb orb1" />
      <div className="orb orb2" />

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
              name="email"
              placeholder="Enter Admin Email"
              value={form.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="input-box">
            <span className="icon">🔒</span>
            <input
              type="password"
              name="password"
              placeholder="Enter Password"
              value={form.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Verifying..." : "Access Dashboard"}
          </button>

        </form>

      </div>

    </div>

  );

};

export default AdminLogin;