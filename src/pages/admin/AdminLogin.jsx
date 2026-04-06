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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="admin-page">
      
      {/* ════ LEFT: PREMIUM INFO PANEL ════ */}
      <div className="admin-left">
        <div className="admin-info-container">
          <div className="panel-badge">
            <span className="dot"></span>
            PopSeat System Core
          </div>
          
          <h1 className="admin-hero-title">
            Welcome to the <br />
            <span>Admin Dashboard</span>
          </h1>
          
          <p className="admin-hero-text">
            Manage the entire PopSeat network securely. Oversee theater operations,
            track global analytics, and maintain platform integrity from one
            centralized, powerful command center.
          </p>

          <div className="admin-metrics">
            <div className="metric-card">
              <div className="metric-icon bg-violet">📊</div>
              <div className="metric-content">
                <h4>Global Status</h4>
                <p>All systems operational</p>
              </div>
            </div>
            <div className="metric-card mt-card">
              <div className="metric-icon bg-green">🛡️</div>
              <div className="metric-content">
                <h4>Security Level</h4>
                <p>Verified encrypted connection</p>
              </div>
            </div>
          </div>
          
          <div className="abstract-glow"></div>
        </div>
      </div>

      {/* ════ RIGHT: LOGIN FORM ════ */}
      <div className="admin-right">
        <div className="admin-card">
          
          <div className="login-brand">
            <img src={logo} alt="PopSeat Logo" />
            <span>PopSeat</span>
          </div>
          
          <h2 className="admin-form-title">Admin Portal</h2>
          <p className="tag">Authorized Secure Access Only</p>

          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="admin-form">
            
            <div className="input-group">
              <label>Administrator Email</label>
              <div className="input-box">
                <span className="icon">📧</span>
                <input
                  type="email"
                  name="email"
                  placeholder="admin@popseat.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-box">
                <span className="icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="checkbox-row">
              <div className="checkbox-wrapper">
                <input 
                  type="checkbox" 
                  id="showPasswordAdmin" 
                  checked={showPassword} 
                  onChange={(e) => setShowPassword(e.target.checked)} 
                />
                <label htmlFor="showPasswordAdmin">
                  Show password
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-content">
                  <span className="spinner"></span> Verifying...
                </span>
              ) : (
                "Access Dashboard →"
              )}
            </button>

          </form>
          
          <div className="admin-footer-note">
            Protected by PopSeat Advanced Security
          </div>

        </div>
      </div>

    </div>
  );
};

export default AdminLogin;
