import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../PopSeat_Logo.png";
import img1 from "../image_1.png";
import img2 from "../image_2.png";
import img3 from "../image_3.png";
import img4 from "../image.png";

const API_BASE = "https://popseat.onrender.com";

const Login = () => {
  const navigate = useNavigate();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("owner");
  const [loading,      setLoading]      = useState(false);
  const [lockTime,     setLockTime]     = useState(0);
  const [remaining,    setRemaining]    = useState(0);
  useEffect(() => {
    if (lockTime > 0) {
      const interval = setInterval(() => {
        const diff = Math.ceil((lockTime - Date.now()) / 1000);
        if (diff <= 0) {
          setRemaining(0);
          setLockTime(0);
          clearInterval(interval);
        } else {
          setRemaining(diff);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockTime]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Please enter email and password");
      return;
    }

    const userKey  = email.trim().toLowerCase();
    const attempts = JSON.parse(localStorage.getItem("loginAttempts") || "{}");
    if (attempts[userKey]?.blockedUntil > Date.now()) {
      setLockTime(attempts[userKey].blockedUntil);
      alert("Too many attempts. Please wait.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:    userKey,
          password: password.trim(),
          role:     selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const current = attempts[userKey] || { count: 0, blockedUntil: 0 };
        current.count++;
        if (current.count >= 5) {
          current.blockedUntil = Date.now() + 2 * 60 * 1000;
          setLockTime(current.blockedUntil);
          alert("Too many wrong attempts. Locked for 2 minutes.");
        } else {
          alert(data.message || "Invalid email, password, or role");
        }
        attempts[userKey] = current;
        localStorage.setItem("loginAttempts", JSON.stringify(attempts));
        return;
      }

      delete attempts[userKey];
      localStorage.setItem("loginAttempts", JSON.stringify(attempts));
      localStorage.clear();
      localStorage.setItem("loginAttempts", JSON.stringify(attempts));

      const role = data.role?.toLowerCase();
      localStorage.setItem("token",  data.token);
      localStorage.setItem("role",   role);
      localStorage.setItem("email",  userKey);
      localStorage.setItem("isAuth", "true");
      if (data.userId) localStorage.setItem("userId", data.userId);

      // If backend returns assignedTheaterId (future-ready), store it
      if (role === "worker" && data.assignedTheaterId) {
        localStorage.setItem("assignedTheaterId", data.assignedTheaterId);
      }

      if (role === "owner")        navigate("/owner/home", { replace: true });
      else if (role === "worker")  navigate("/worker",     { replace: true });
      else                         alert("Unknown role: " + role);

    } catch (error) {
      console.error("Login error:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" id="auth-login-page">

      {/* ═══════════════════════════════════════════
          LEFT — CINEMATIC MOSAIC PANEL
      ═══════════════════════════════════════════ */}
      <div className="login-left">

        {/* Film strips — decorative divs so ::before/::after stay free */}
        <div className="filmstrip-top"  aria-hidden="true" />
        <div className="filmstrip-bottom" aria-hidden="true" />
        <div className="panel-sep"      aria-hidden="true" />

        {/* ── 3-image mosaic ── */}
        <div className="mosaic-grid">

          {/* Card 1 — Hero tall (left column, spans 2 rows) */}
          <div className="mosaic-card mosaic-hero">
            <img src={img1} alt="Cinema hall" />
            <div className="mosaic-card-overlay">
              <span className="mosaic-card-label">Grand Rex</span>
              <span className="mosaic-card-sub">Premier Cinema</span>
            </div>
            <div className="mosaic-card-shine" aria-hidden="true" />
          </div>

          {/* Card 2 — top right */}
          <div className="mosaic-card mosaic-tr">
            <img src={img2} alt="Night screening" />
            <div className="mosaic-card-overlay">
              <span className="mosaic-card-label">Midnight</span>
            </div>
            <div className="mosaic-card-shine" aria-hidden="true" />
          </div>

          {/* Card 3 — bottom right */}
          <div className="mosaic-card mosaic-br">
            <img src={img3} alt="Premiere event" />
            <div className="mosaic-card-overlay">
              <span className="mosaic-card-label">Emerald</span>
            </div>
            <div className="mosaic-card-shine" aria-hidden="true" />
          </div>

        </div>{/* /mosaic-grid */}

        {/* ── Overlay brand text ── */}
        <div className="panel-overlay" aria-hidden="true">
          <span className="panel-badge">
            <span className="panel-badge-dot" />
            Cinema Management
          </span>
          <h2 className="panel-headline">
            YOUR<em>STAGE</em>
          </h2>
          <p className="panel-tagline">Luxury · Premium · Exclusive</p>
          <div className="panel-stars">
            {[0,1,2,3,4].map(i => <span key={i} className="panel-star" />)}
          </div>
        </div>

      </div>{/* /login-left */}

      {/* ═══════════════════════════════════════════
          RIGHT — FORM PANEL
      ═══════════════════════════════════════════ */}
      <div className="login-right">
        <div className="login-card">

          {/* Brand */}
          <div className="brand">
            <img src={logo} alt="PopSeat" className="brand-logo" />
            <div className="brand-text">
              <h1 className="brand-name">Pop<span>Seat</span></h1>
              
            </div>
          </div>

          {/* Divider */}
          <div className="brand-divider" aria-hidden="true" />

          {/* Title */}
          <h2 className="login-title">Welcome <span className="title-accent">Back</span></h2>
          <p className="login-subtitle">Sign in to your account</p>

          {/* Role selector */}
          <div className="role-selector">
            <div
              className={`role-card ${selectedRole === "owner" ? "active" : ""}`}
              onClick={() => setSelectedRole("owner")}
            >
              <span className="role-icon">👑</span> Owner
            </div>
            <div
              className={`role-card ${selectedRole === "worker" ? "active" : ""}`}
              onClick={() => setSelectedRole("worker")}
            >
              <span className="role-icon">👷</span> Worker
            </div>
          </div>

          {/* Inputs */}
          <input
            className="login-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <input
            className="login-input"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", alignSelf: "flex-start" }}>
            <input 
              type="checkbox" 
              id="showPasswordLogin" 
              checked={showPassword} 
              onChange={(e) => setShowPassword(e.target.checked)} 
              style={{ width: "16px", height: "16px", cursor: "pointer", margin: 0 }}
            />
            <label htmlFor="showPasswordLogin" style={{ cursor: "pointer", fontSize: "0.9rem", userSelect: "none" }}>
              Show password
            </label>
          </div>

          {/* Lock timer */}
          {remaining > 0 && (
            <p className="lock-timer">
              🔒 Login locked. Try again in {remaining}s
            </p>
          )}

          {/* CTA */}
          <button
            className="login-button"
            onClick={handleLogin}
            disabled={loading || remaining > 0}
          >
            {loading ? "Logging in…" : "Login to PopSeat"}
          </button>

          {/* Links */}
          {selectedRole === "owner" && (
            <>
              <p className="login-link">
                <Link to="/forgotpassword">Forgot password?</Link>
              </p>
              <p className="login-text">
                Don't have an account?{" "}
                <Link to="/register">Register →</Link>
              </p>
            </>
          )}

          {selectedRole === "worker" && (
            <p className="login-text login-text--worker">
              Worker accounts are created by the Owner
            </p>
          )}

        </div>
      </div>

    </div>
  );
};

export default Login;