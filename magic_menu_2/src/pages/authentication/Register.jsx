import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");

  const handleRegister = () => {
    if (!name || !email || !password) {
      alert("Fill all fields");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const exists = users.find(u => u.email === email);
    if (exists) {
      alert("Email already registered");
      return;
    }

    users.push({ name, email, password, role });

    localStorage.setItem("users", JSON.stringify(users));

    alert("Registration Successful");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-80">
        <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>

        <input
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Full Name"
          onChange={e => setName(e.target.value)}
        />

        <input
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Email"
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
        />

        <button
          onClick={handleRegister}
          className="w-full bg-indigo-600 text-white py-2 rounded mb-3"
        >
          Register
        </button>

        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link to="/" className="text-blue-600 underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
