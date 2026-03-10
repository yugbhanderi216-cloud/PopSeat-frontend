import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import logo from "../PopSeat_Logo.png";

/* Your 4 images */
import img1 from "../image.png";
import img2 from "../image_3.png";
import img3 from "../image_2.png";
import img4 from "../image_1.png";

import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [strength, setStrength] = useState(0);
  const [isEightChar, setIsEightChar] = useState(false);

  /* Create SUPER_ADMIN if not exists */
  useEffect(() => {
    let users = JSON.parse(localStorage.getItem("users")) || [];

    const superAdminExists = users.some(
      (u) => u.role === "SUPER_ADMIN"
    );

    if (!superAdminExists) {
      users.push({
        id: 1,
        name: "System Super Admin",
        email: "admin@system.com",
        password: "Super@123",
        role: "SUPER_ADMIN",
      });

      localStorage.setItem("users", JSON.stringify(users));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "password") {
      setIsEightChar(value.length >= 8);
      const result = zxcvbn(value);
      setStrength(result.score);
    }
  };

  const handleRegister = () => {
    if (!(isEightChar && strength === 4)) return;

    let users = JSON.parse(localStorage.getItem("users")) || [];

    users.push({
      id: Date.now(),
      ...formData,
      role: "OWNER",
    });

    localStorage.setItem("users", JSON.stringify(users));
    navigate("/login");
  };

  const strengthText = [
    "Very Weak",
    "Weak",
    "Fair",
    "Strong",
    "Very Strong",
  ];

  return (
    <div className="register-page">

      {/* LEFT SIDE - REGISTER CARD */}
      <div className="register-right">
        <div className="register-card">

          {/* BRAND */}
          <div className="brand">
            <img src={logo} alt="PopSeat Logo" />
            <h1>PopSeat</h1>
          </div>

          <h2>Create Owner Account</h2>

          <input
            name="name"
            placeholder="Full Name"
            onChange={handleChange}
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
          />

          <div className={`rule ${isEightChar ? "valid" : ""}`}>
            {isEightChar ? "✔" : "✖"} Minimum 8 Characters
          </div>

          <div className={`rule ${strength === 4 ? "valid" : ""}`}>
            {strength === 4 ? "✔" : "✖"} Password Must Be Very Strong
          </div>

          <div className="strength-bar">
            <div className={`strength strength-${strength}`}></div>
          </div>

          <small className="strength-text">
            Strength: {strengthText[strength]}
          </small>

          <button
            onClick={handleRegister}
            disabled={!(isEightChar && strength === 4)}
          >
            Register
          </button>

          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>

        </div>
      </div>

      {/* RIGHT SIDE - IMAGES */}
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