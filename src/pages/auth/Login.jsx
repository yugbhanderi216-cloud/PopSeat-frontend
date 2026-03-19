import React, { useState } from "react";
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

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [selectedRole, setSelectedRole] = useState("owner");
    const [loading, setLoading] = useState(false);

    /* ================= LOGIN FUNCTION ================= */

   const handleLogin = async () => {

    // ✅ Validation
    if (!email.trim() || !password.trim()) {
        alert("Please enter email and password");
        return;
    }

    try {
        setLoading(true);

        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.trim(),
                password: password.trim(),
                role: selectedRole === "owner" ? "owner" : "worker"
            })
        });

        const data = await response.json();

        console.log("Login response:", data);

        // ❌ Handle API error
        if (!response.ok || !data.success) {
            alert(data.message || "Invalid credentials");
            return;
        }

        // ✅ Store all required data
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("email", email);
        localStorage.setItem("userId", data.userId || "");
        localStorage.setItem("assignedTheaterId", data.assignedTheaterId || "");
        localStorage.setItem("isAuth", "true"); // 🔥 VERY IMPORTANT

        // ✅ Navigation
        const role = data.role?.toLowerCase()


if (role === "owner") {
    navigate("/owner/home", { replace: true });
} else if (role === "worker") {
    navigate("/worker", { replace: true });
} else {
    alert("Unknown role");
}

    } catch (error) {
        console.error("Login error:", error);
        alert("Network error. Please try again.");
    } finally {
        setLoading(false);
    }
};
    /* ================= UI ================= */

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

                    {/* ROLE SELECTOR */}
                    <div className="role-selector">

                        <div
                            className={`role-card ${selectedRole === "owner" ? "active" : ""}`}
                            onClick={() => setSelectedRole("owner")}
                        >
                            👑 Owner
                        </div>

                        <div
                            className={`role-card ${selectedRole === "worker" ? "active" : ""}`}
                            // onClick={() => setSelectedRole("worker")}
                            onClick={() => {
  console.log("Selected Worker");
  setSelectedRole("worker");
}}
                        >
                            👷 Worker
                        </div>

                    </div>

                    {/* EMAIL */}
                    <input
                        className="login-input"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    {/* PASSWORD */}
                    <input
                        className="login-input"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {/* BUTTON */}
                    <button
                        type="button"
                        className="login-button"
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    {/* ✅ SHOW ONLY FOR OWNER */}
                    {selectedRole === "owner" && (
                        <>
                            <p className="login-link">
                                <Link to="/forgotpassword">Forgot password?</Link>
                            </p>

                            <p className="login-text">
                                Don’t have an account? <Link to="/register">Register</Link>
                            </p>
                        </>
                    )}

                    {/* ✅ OPTIONAL MESSAGE FOR WORKER */}
                    {selectedRole === "worker" && (
                        <p className="login-text">
                            Worker accounts are created by Owner
                        </p>
                    )}

                </div>

            </div>

        </div>

    );

};

export default Login;