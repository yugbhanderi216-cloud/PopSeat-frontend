import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const inputs = useRef([]);

  const sendOtp = () => {
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const found = users.find(u => u.email === email);

    if (!found) {
      alert("Email not registered");
      return;
    }

    const fakeOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(fakeOtp);

    alert("OTP sent (demo): " + fakeOtp);
  };

  const handleOtpChange = (value, index) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move forward
    if (value && index < 3) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (otp[index] === "" && index > 0) {
        inputs.current[index - 1].focus();
      }
    }
  };

  const resetPassword = () => {
    const enteredOtp = otp.join("");

    if (enteredOtp !== generatedOtp) {
      alert("Invalid OTP");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const userIndex = users.findIndex(u => u.email === email);

    users[userIndex].password = newPassword;
    localStorage.setItem("users", JSON.stringify(users));

    alert("Password updated");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-80">

        <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>

        <input
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="Enter Email"
          onChange={e => setEmail(e.target.value)}
        />

        <button
          onClick={sendOtp}
          className="w-full bg-indigo-600 text-white py-2 rounded mb-4"
        >
          Send OTP
        </button>

        {/* OTP BOXES */}
        <div className="flex justify-between mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => inputs.current[index] = el}
              maxLength="1"
              value={digit}
              onChange={e => handleOtpChange(e.target.value, index)}
              onKeyDown={e => handleKeyDown(e, index)}
              className="w-12 h-12 border text-center text-xl rounded"
            />
          ))}
        </div>

        <input
          type="password"
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="New Password"
          onChange={e => setNewPassword(e.target.value)}
        />

        <button
          onClick={resetPassword}
          className="w-full bg-indigo-600 text-white py-2 rounded mb-3"
        >
          Reset Password
        </button>

        <p className="text-center text-sm">
          <Link to="/" className="text-blue-600 underline">
            Back to Login
          </Link>
        </p>

      </div>
    </div>
  );
};

export default ForgotPassword;
