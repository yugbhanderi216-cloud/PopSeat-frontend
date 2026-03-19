import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import logo from "../PopSeat_Logo.png";

import img1 from "../image.png";
import img2 from "../image_3.png";
import img3 from "../image_2.png";
import img4 from "../image_1.png";

import "./Register.css";

const API_BASE = "https://popseat.onrender.com";

const strengthText = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [strength, setStrength] = useState(0);
  const [isEightChar, setIsEightChar] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ── input change ── */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({ ...formData, [name]: value });

    if (name === "password") {
      setIsEightChar(value.length >= 8);
      setStrength(zxcvbn(value).score);
    }
  };

  /* ── register ── */
  const handleRegister = async () => {

    // ── validation ──
    if (!formData.name.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!formData.email.trim()) {
      alert("Please enter your email.");
      return;
    }
    if (!isEightChar || strength < 4) {
      alert("Password must be at least 8 characters and Very Strong.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/api/owner/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Registration failed. Please try again.");
        return;
      }

      // ✅ Registration successful — do NOT auto-login
      // Do NOT save token/role here — user must log in manually
      alert(data.message || "Account created! Please log in.");
      navigate("/login");           // ← correct redirect

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

      {/* FORM SIDE */}
      <div className="register-right">
        <div className="register-card">

          <div className="brand">
            <img src={logo} alt="PopSeat Logo" />
            <h1>PopSeat</h1>
          </div>

          <h2>Create Owner Account</h2>

          <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>

            <input
              name="name"
              value={formData.name}
              placeholder="Full Name"
              onChange={handleChange}
              required
            />

            <input
              name="email"
              type="email"
              value={formData.email}
              placeholder="Email"
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              value={formData.password}
              placeholder="Password"
              onChange={handleChange}
              required
            />

            {/* PASSWORD RULES */}
            <div className={`rule ${isEightChar ? "valid" : ""}`}>
              {isEightChar ? "✔" : "✖"} Minimum 8 Characters
            </div>

            <div className={`rule ${strength === 4 ? "valid" : ""}`}>
              {strength === 4 ? "✔" : "✖"} Password Must Be Very Strong
            </div>

            {/* STRENGTH BAR */}
            <div className="strength-bar">
              <div className={`strength strength-${strength}`}></div>
            </div>

            <small className="strength-text">
              Strength: {strengthText[strength]}
            </small>

            <button type="submit" disabled={!isFormValid || loading}>
              {loading ? "Registering..." : "Register"}
            </button>

          </form>

          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>

        </div>
      </div>

      {/* IMAGE SIDE */}
      <div className="register-left">
        <img src={img1} alt="" />
        <img src={img2} alt="" />
        <img src={img3} alt="" />
        <img src={img4} alt="" />
      </div>

    </div>
  );
}

export default Register;