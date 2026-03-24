import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import "./ForgotPassword.css";

const API_BASE = "https://popseat.onrender.com";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);  // 6-digit OTP
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [strength, setStrength] = useState(0);
  const [isEightChar, setIsEightChar] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  const inputs = useRef([]);
  const timerRef = useRef(null);

  /* ================= RESEND TIMER ================= */
  const startResendTimer = () => {
    clearInterval(timerRef.current);
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* ================= SEND OTP ================= */
  const sendOtp = async () => {
    if (!email) { alert("Please enter your email address"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { alert("Please enter a valid email address"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {  // ✅ fixed endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setOtp(["", "", "", "", "", ""]);
        startResendTimer();
        alert("OTP sent to your email");
      } else {
        alert(data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RESEND OTP ================= */
  const resendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-otp`, {  // ✅ dedicated resend endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtp(["", "", "", "", "", ""]);
        startResendTimer();
        alert("OTP resent to your email");
      } else {
        alert(data.message || "Failed to resend OTP");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= OTP INPUT ================= */
  const handleOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    pasted.split("").forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  /* ================= PASSWORD HANDLERS ================= */
  const handlePasswordChange = (value) => {
    setNewPassword(value);
    setIsEightChar(value.length >= 8);
    setStrength(zxcvbn(value).score);
    setPasswordsMatch(confirmPassword.length > 0 && value === confirmPassword);
  };

  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    setPasswordsMatch(value.length > 0 && newPassword === value);
  };

  /* ================= RESET PASSWORD (verify OTP + reset in one call) ================= */
  const handleReset = async () => {
    const enteredOtp = otp.join("");
    if (enteredOtp.length !== 6) { alert("Please enter the complete 6-digit OTP"); return; }
    if (!isEightChar || strength < 4) { alert("Password must be at least 8 characters and very strong"); return; }
    if (!passwordsMatch) { alert("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {  // ✅ verify + reset in one call
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: enteredOtp, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Password reset successful! Please log in.");
        navigate("/login");
      } else {
        alert(data.message || "Failed to reset password");
        setOtp(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strengthText = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const isOtpComplete = otp.every((d) => d !== "");
  const canReset = isOtpComplete && isEightChar && strength === 4 && passwordsMatch;

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <h2 className="forgot-title">Reset Password</h2>

        {/* ── STEP 1: Email ── */}
        <div className="step-section">
          <label className="forgot-label">Email Address</label>
          <input
            type="email"
            className="forgot-input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={otpSent}
          />
          {/* Send (first time) */}
          {!otpSent && (
            <button className="forgot-button" onClick={sendOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          )}
          {/* Resend (after OTP sent) */}
          {otpSent && (
            <button
              className="forgot-button"
              onClick={resendOtp}
              disabled={loading || resendTimer > 0}
            >
              {loading ? "Sending..." : resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : "Resend OTP"}
            </button>
          )}
        </div>

        {/* ── STEP 2 + 3: OTP & New Password (shown together after OTP sent) ── */}
        {otpSent && (
          <>
            <div className="step-section">
              <label className="forgot-label">Enter OTP</label>
              <div className="otp-box">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    onPaste={handleOtpPaste}
                    className="otp-input"
                  />
                ))}
              </div>
            </div>

            <div className="step-section">
              <label className="forgot-label">New Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="forgot-input"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                />
                <button type="button" className="toggle-eye" onClick={() => setShowPassword((p) => !p)}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <label className="forgot-label" style={{ marginTop: "12px" }}>Confirm Password</label>
              <div className="input-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="forgot-input"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                />
                <button type="button" className="toggle-eye" onClick={() => setShowConfirm((p) => !p)}>
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>

              <div className={`rule ${isEightChar ? "valid" : ""}`}>
                {isEightChar ? "✔" : "✖"} Minimum 8 Characters
              </div>
              <div className={`rule ${strength === 4 ? "valid" : ""}`}>
                {strength === 4 ? "✔" : "✖"} Password Must Be Very Strong
              </div>
              {confirmPassword.length > 0 && (
                <div className={`rule ${passwordsMatch ? "valid" : ""}`}>
                  {passwordsMatch ? "✔" : "✖"} Passwords Match
                </div>
              )}

              <div className="strength-bar">
                <div className={`strength strength-${strength}`}></div>
              </div>
              <small className="strength-text">Strength: {strengthText[strength]}</small>

              <button className="forgot-button" onClick={handleReset} disabled={loading || !canReset}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </>
        )}

        <p className="forgot-text">
          <Link to="/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;