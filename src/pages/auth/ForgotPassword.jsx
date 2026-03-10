import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import "./ForgotPassword.css";

const ForgotPassword = () => {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [strength, setStrength] = useState(0);
  const [isEightChar, setIsEightChar] = useState(false);
  const [isOtpValid, setIsOtpValid] = useState(false);

  const inputs = useRef([]);

  // ===== SEND OTP =====

  const sendOtp = () => {

    if (!email) {
      alert("Please enter email");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const found = users.find((u) => u.email === email);

    if (!found) {
      alert("Email not registered");
      return;
    }

    const fakeOtp = Math.floor(1000 + Math.random() * 9000).toString();

    setGeneratedOtp(fakeOtp);
    setOtpSent(true);

    // AUTO FILL OTP (Demo)
    setOtp(fakeOtp.split(""));
    setIsOtpValid(true);

    alert("OTP sent (demo): " + fakeOtp);
  };

  // ===== OTP CHANGE =====

  const handleOtpChange = (value, index) => {

    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;

    setOtp(newOtp);

    const joinedOtp = newOtp.join("");

    setIsOtpValid(joinedOtp.length === 4 && joinedOtp === generatedOtp);

    if (value && index < 3) {
      inputs.current[index + 1].focus();
    }

  };

  // ===== BACKSPACE =====

  const handleKeyDown = (e, index) => {

    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs.current[index - 1].focus();
    }

  };

  // ===== OTP PASTE =====

  const handleOtpPaste = (e) => {

    const pasted = e.clipboardData.getData("text").slice(0, 4);

    if (!/^\d{4}$/.test(pasted)) return;

    const newOtp = pasted.split("");

    setOtp(newOtp);

    setIsOtpValid(pasted === generatedOtp);

  };

  // ===== PASSWORD CHANGE =====

  const handlePasswordChange = (value) => {

    setNewPassword(value);

    setIsEightChar(value.length >= 8);

    const result = zxcvbn(value);

    setStrength(result.score);

  };

  // ===== RESET PASSWORD =====

  const handleReset = () => {

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const userIndex = users.findIndex((u) => u.email === email);

    if (userIndex === -1) {
      alert("User not found");
      return;
    }

    users[userIndex].password = newPassword;

    localStorage.setItem("users", JSON.stringify(users));

    alert("Password updated successfully");

    // Reset fields

    setEmail("");
    setOtp(["", "", "", ""]);
    setGeneratedOtp("");
    setNewPassword("");
    setOtpSent(false);
    setStrength(0);
    setIsEightChar(false);
    setIsOtpValid(false);

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

    <div className="forgot-page">

      <div className="forgot-card">

        <h2 className="forgot-title">Reset Password</h2>

        <input
          type="email"
          className="forgot-input"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          className="forgot-button"
          onClick={sendOtp}
        >
          Send OTP
        </button>

        {otpSent && (

          <>

            {/* OTP BOX */}

            <div
              className="otp-box"
              onPaste={handleOtpPaste}
            >

              {otp.map((digit, index) => (

                <input
                  key={index}
                  ref={(el) => (inputs.current[index] = el)}
                  type="text"
                  maxLength="1"
                  value={digit}

                  onChange={(e) =>
                    handleOtpChange(e.target.value, index)
                  }

                  onKeyDown={(e) =>
                    handleKeyDown(e, index)
                  }

                  className="otp-input"
                />

              ))}

            </div>

            {/* OTP ERROR */}

            {otp.join("").length === 4 && !isOtpValid && (

              <p style={{ color: "red", fontSize: "13px" }}>
                Invalid OTP
              </p>

            )}

            {/* PASSWORD INPUT */}

            <input
              type="password"
              className="forgot-input"
              placeholder="New Password"
              value={newPassword}

              onChange={(e) =>
                handlePasswordChange(e.target.value)
              }
            />

            {/* RULES */}

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

            {/* RESET BUTTON */}

            <button
              className="forgot-button"
              onClick={handleReset}
              disabled={!(isEightChar && strength === 4 && isOtpValid)}
            >
              Reset Password
            </button>

          </>

        )}

        <p className="forgot-text">
          <Link to="/login">Back to Login</Link>
        </p>

      </div>

    </div>

  );

};

export default ForgotPassword;