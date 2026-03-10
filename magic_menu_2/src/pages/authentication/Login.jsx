import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    if (users.length === 0) {
      alert("No users registered");
      return;
    }

    const foundUser = users.find(u => u.email === email);

    if (!foundUser) {
      alert("Email not registered");
      return;
    }

    if (foundUser.password !== password) {
      alert("Wrong password");
      return;
    }

    alert("Login Success");
    navigate("/Cafe");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-80">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>

        <input
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Email"
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-indigo-600 text-white py-2 rounded mb-3"
        >
          Login
        </button>

        <p className="text-center mb-2">
          <Link to="/ForgotPassword" className="text-blue-600 underline">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-sm">
          Don’t have an account?{" "}
          <Link to="/Register" className="text-blue-600 underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
