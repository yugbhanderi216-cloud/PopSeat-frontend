import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import logo from "../PopSeat_Logo.png";

import img1 from "../image_1.png";
import img2 from "../image_2.png";
import img3 from "../image_3.png";

import "./Register.css";

const API_BASE     = "https://popseat.onrender.com";
const strengthText = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData]       = useState({ name: "", email: "", password: "" });
  const [strength, setStrength]       = useState(0);
  const [isEightChar, setIsEightChar] = useState(false);
  const [loading, setLoading]         = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === "password") {
      setIsEightChar(value.length >= 8);
      setStrength(zxcvbn(value).score);
    }
  };

  const handleRegister = async () => {
    if (!formData.name.trim())  { alert("Please enter your full name."); return; }
    if (!formData.email.trim()) { alert("Please enter your email."); return; }
    if (!isEightChar || strength < 4) {
      alert("Password must be at least 8 characters and Very Strong.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/owner/register`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     formData.name.trim(),
          email:    formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.message || "Registration failed. Please try again.");
        return;
      }
      alert(data.message || "Account created! Please log in.");
      navigate("/login");
    } catch (error) {
      console.error("Register error:", error);
      alert("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = isEightChar && strength === 4;

  return (
    <div className="register-page">

      {/* ═══════════════════════════════════════════
          LEFT — FORM PANEL
      ═══════════════════════════════════════════ */}
      <div className="register-left">
        <div className="register-card">

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
          <h2 className="register-title">Create <span className="title-accent">Account</span></h2>
          <p className="register-subtitle">Owner registration</p>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>

            <input
              className="register-input"
              name="name"
              value={formData.name}
              placeholder="Full Name"
              onChange={handleChange}
              required
            />

            <input
              className="register-input"
              name="email"
              type="email"
              value={formData.email}
              placeholder="Email address"
              onChange={handleChange}
              required
            />

            <input
              className="register-input"
              type="password"
              name="password"
              value={formData.password}
              placeholder="Password"
              onChange={handleChange}
              required
            />

            {/* Password rules */}
            <div className={`rule ${isEightChar ? "valid" : ""}`}>
              {isEightChar ? "✔" : "✖"} Minimum 8 Characters
            </div>

            <div className={`rule ${strength === 4 ? "valid" : ""}`}>
              {strength === 4 ? "✔" : "✖"} Password Must Be Very Strong
            </div>

            {/* Strength bar */}
            <div className="strength-bar">
              <div className={`strength strength-${strength}`} />
            </div>

            <small className="strength-text">
              Strength: {strengthText[strength]}
            </small>

            <button
              className="register-button"
              type="submit"
              disabled={!isFormValid || loading}
            >
              {loading ? "Registering…" : "Create Account"}
            </button>

          </form>

          <p className="register-text">
            Already have an account?{" "}
            <Link to="/login">Sign in →</Link>
          </p>

        </div>
      </div>

      {/* ═══════════════════════════════════════════
          RIGHT — CINEMATIC MOSAIC PANEL
      ═══════════════════════════════════════════ */}
      <div className="register-right">

        {/* Film strips */}
        <div className="filmstrip-top"    aria-hidden="true" />
        <div className="filmstrip-bottom" aria-hidden="true" />
        <div className="panel-sep"        aria-hidden="true" />

        {/* 3-image mosaic grid */}
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

        {/* Panel overlay brand text */}
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

      </div>{/* /register-right */}

    </div>
  );
}

export default Register;