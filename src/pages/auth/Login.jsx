import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../PopSeat_Logo.png";
import img1 from "../image_1.png";
import img2 from "../image_2.png";
import img3 from "../image_3.png";
import img4 from "../image.png";
const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("OWNER");
  const [lockTime, setLockTime] = useState(0);
  const [remaining, setRemaining] = useState(0);
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
  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const attempts = JSON.parse(localStorage.getItem("loginAttempts")) || {};
    const userKey = email.trim().toLowerCase();
    /* CHECK IF USER IS BLOCKED */
    if (attempts[userKey] && attempts[userKey].blockedUntil > Date.now()) {
      setLockTime(attempts[userKey].blockedUntil);
      alert("Too many attempts. Please wait.");
      return;
    }
    /* FIND USER */
    const foundUser = users.find((u) => u.email.toLowerCase() === userKey && u.password === password && u.role.toUpperCase() === selectedRole);
    /* WRONG LOGIN */
    if (!foundUser) {
      const current = attempts[userKey] || { count: 0, blockedUntil: 0 };
      current.count++;
      if (current.count >= 5) {
        current.blockedUntil = Date.now() + 2 * 60 * 1000;
        setLockTime(current.blockedUntil);
        alert("Too many wrong attempts. Locked for 2 minutes.");
      }
      attempts[userKey] = current;
      localStorage.setItem("loginAttempts", JSON.stringify(attempts));
      alert("Invalid email, password, or role");
      return;
    }
    /* RESET ATTEMPTS */
    delete attempts[userKey];
    localStorage.setItem("loginAttempts", JSON.stringify(attempts));
    const role = foundUser.role.toUpperCase();
    localStorage.setItem("isAuth", "true");
    localStorage.setItem("loggedInUser", foundUser.email);
    localStorage.setItem("role", role);
    /* OWNER LOGIN */
    if (role === "OWNER") {
      let theaters = JSON.parse(localStorage.getItem("theaters")) || [];
      if (!Array.isArray(theaters)) { theaters = Object.values(theaters); }
      const myTheaters = theaters.filter((t) => t.ownerEmail === foundUser.email);
      if (myTheaters.length === 0) {
        navigate("/theater-register");
      } else {
        navigate("/owner/home");
      }
      return;
    }
    /* BRANCH LOGIN */
    if (role === "BRANCH") {
      let theaters = JSON.parse(localStorage.getItem("theaters")) || [];
      if (!Array.isArray(theaters)) { theaters = Object.values(theaters); }
      const theater = theaters.find((t) => t.id === foundUser.theaterId);
      if (!theater || theater.status !== "Active") {
        alert("This theater is Disabled by Super Admin.");
        return;
      }
      localStorage.setItem("branchTheaterId", foundUser.theaterId);
      navigate("/theater/overview", { state: { theaterId: foundUser.theaterId } });
      return;
    }
  };
  return (
    <div className="login-page">
      <div className="login-left">
        <img src={img1} alt="" />
        <img src={img2} alt="" />
        <img src={img3} alt="" />
        <img src={img4} alt="" />
      </div>
      <div className="login-right">
        <div className="login-card">
          <div className="brand">
            <img src={logo} alt="PopSeat Logo" />
            <h1>PopSeat</h1>
          </div>
          <h2 className="login-title">Login</h2>
          <div className="role-selector">
            <div className={`role-card ${selectedRole === "OWNER" ? "active" : ""}`} onClick={() => setSelectedRole("OWNER")}>
              👑 Owner
            </div>
            <div className={`role-card ${selectedRole === "BRANCH" ? "active" : ""}`} onClick={() => setSelectedRole("BRANCH")}>
              👷 Worker
            </div>
          </div>
          <input className="login-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="login-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {remaining > 0 && (
            <p className="lock-timer">
              Login locked. Try again in {remaining} sec
            </p>
          )}
          <button className="login-button" onClick={handleLogin}>
            Login
          </button>
          <p className="login-link">
            <Link to="/forgotpassword">Forgot password?</Link>
          </p>
          <p className="login-text">
            Don’t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;