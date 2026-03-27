import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomerLogin.css";

const BASE_URL = "https://popseat.onrender.com";

const CustomerLogin = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const params    = new URLSearchParams(location.search);
  const theaterId = params.get("theaterId");
  const redirect  = params.get("redirect"); // set when coming from a QR scan

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

        localStorage.setItem("customerToken", data.token);
        localStorage.setItem("customerRole", data.role);
        localStorage.setItem("customerEmail", email);

        // If came from QR scan, go back to the original menu URL
        if (redirect) {
          window.location.href = decodeURIComponent(redirect);
        } else {
          navigate(`/payment?theaterId=${theaterId}`);
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

      {/* BACK BUTTON */}

      <div className="login-header">

        <button className="back-btn" onClick={goBack}>
          ←
        </button>

      </div>

      {/* CENTER CARD */}

      <div className="login-container">

        <div className="login-card">

          <h2>Customer Login</h2>

          <input
            type="email"
            placeholder="Enter Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            disabled={otpSent || loading}
            className="mobile-input"
          />

          {/* ERROR MESSAGE */}

          {error && (
            <p className="error-text" style={{ color: "red", fontSize: "13px", marginTop: "6px" }}>
              {error}
            </p>
          )}

          {!otpSent ? (

            <button
              onClick={handleSendOtp}
              className="primary-btn"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>

          ) : (

            <>

              <p style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>
                OTP sent to <strong>{email}</strong>
              </p>

              {/* OTP BOX — 6 digits to match API */}

              <div
                className={`otp-box ${locked ? "locked" : ""}`}
                onPaste={handleOtpPaste}
              >

                {otp.map((digit, index) => (

                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={digit}
                    ref={(el) => (inputRefs.current[index] = el)}

                    onChange={(e) =>
                      handleOtpChange(e.target.value, index)
                    }

                    onKeyDown={(e) =>
                      handleKeyDown(e, index)
                    }

                    disabled={locked || loading}
                  />

                ))}

              </div>

              {/* LOADING */}

              {loading && <div className="spinner"></div>}

              {/* TIMER / RESEND */}

              {locked ? (

                <p className="timer-text">
                  Too many attempts. Try again in {timer}s
                </p>

              ) : timer > 0 ? (

                <p className="timer-text">
                  Resend OTP in {timer}s
                </p>

              ) : (

                <button
                  onClick={handleSendOtp}
                  className="resend-btn"
                  disabled={loading}
                >
                  Resend OTP
                </button>

              )}

            </>

          )}

        </div>

      </div>

    </div>

  );

};

export default CustomerLogin;