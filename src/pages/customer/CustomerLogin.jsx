import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomerLogin.css";

const BASE_URL = "https://popseat.onrender.com";

const CustomerLogin = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const theaterId = params.get("theaterId");
  const redirect = params.get("redirect"); // set when coming from a QR scan

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);  // 6-digit OTP from API
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = useRef([]);

  const goBack = () => navigate(-1);

  /* TIMER */

  useEffect(() => {

    let interval = null;

    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }

    if (timer === 0 && locked) {
      setLocked(false);
      setAttempts(0);
    }

    return () => clearInterval(interval);

  }, [timer, locked]);

  /* EMAIL VALIDATION */

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /* SEND OTP — POST /api/auth/send-email-otp */

  const handleSendOtp = async () => {

    if (!validateEmail(email)) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {

      const response = await fetch(`${BASE_URL}/api/auth/send-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        setTimer(30);
        setAttempts(0);
        setOtp(["", "", "", "", "", ""]);
      } else {
        setError(data.message || "Failed to send OTP. Please try again.");
      }

    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }

  };

  /* OTP INPUT */

  const handleOtpChange = (value, index) => {

    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    if (newOtp.join("").length === 6) {
      verifyOtp(newOtp.join(""));
    }

  };

  /* BACKSPACE */

  const handleKeyDown = (e, index) => {

    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }

  };

  /* OTP PASTE */

  const handleOtpPaste = (e) => {

    const pasted = e.clipboardData.getData("text").slice(0, 6);

    if (!/^\d{6}$/.test(pasted)) return;

    const newOtp = pasted.split("");
    setOtp(newOtp);
    verifyOtp(pasted);

  };

  /* VERIFY OTP — POST /api/auth/verify-email-otp */

  const verifyOtp = async (enteredOtp) => {

    if (locked) return;

    setLoading(true);
    setError("");

    try {

      const response = await fetch(`${BASE_URL}/api/auth/verify-email-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp: enteredOtp }),
      });

      const data = await response.json();

      if (data.success) {

        localStorage.setItem("token", data.token);
        localStorage.setItem("role", "customer");
        // No email storage needed per strict instructions
        
        if (redirect) {
          navigate(decodeURIComponent(redirect));
        } else {
          navigate("/customer/menu");
        }

      } else {

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 3) {
          setLocked(true);
          setTimer(30);
          setError("Too many incorrect attempts. Please wait 30 seconds.");
        } else {
          setError(data.message || "Invalid OTP. Please try again.");
        }

        setOtp(["", "", "", "", "", ""]);

        if (!locked && inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }

      }

    } catch (err) {
      setError("Network error. Please check your connection.");
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }

  };

  return (

    <div className="login-page">

      {/* HEADER */}
      <div className="login-header">
        <button className="back-btn" onClick={goBack}>
          ←
        </button>
      </div>

      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">Customer Login</h1>
          <p className="login-subtitle">
            Enter your email to verify and pay
          </p>

          {!otpSent && (
            <div className="input-group fade-in">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                disabled={otpSent || loading}
                className="login-input"
              />
            </div>
          )}

          {/* ERROR ALERT */}
          {error && (
            <div className="error-alert fade-in">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {!otpSent && (
            <button
              onClick={handleSendOtp}
              className="login-primary-btn"
              disabled={loading || !email}
            >
              {loading ? "Sending Code..." : "Send Verification Code"}
            </button>
          )}

          {otpSent && (
            <div className="otp-section fade-in">
              <p className="otp-instruction">
                We've sent a 6-digit code to <strong>{email}</strong>.
                Please enter it below.
              </p>

              <div className="otp-box" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    disabled={locked || loading}
                    className="otp-input"
                  />
                ))}
              </div>

              {/* CONTROLS */}
              <div className="otp-controls">
                {locked ? (
                  <div className="lock-badge">
                    Locked for {timer}s
                  </div>
                ) : timer > 0 ? (
                  <p className="resend-timer">
                    Resend code in <span>{timer}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    className="login-resend-btn"
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>

  );

};

export default CustomerLogin;
