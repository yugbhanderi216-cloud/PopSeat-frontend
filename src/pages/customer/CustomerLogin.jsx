import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomerLogin.css";

const CustomerLogin = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const theaterId = params.get("theaterId");

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [timer, setTimer] = useState(0);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

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

  /* SEND OTP */

  const handleSendOtp = () => {

    if (!validateEmail(email)) {
      alert("Enter valid email address");
      return;
    }

    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();

    setGeneratedOtp(randomOtp);
    setOtpSent(true);
    setTimer(30);
    setAttempts(0);

    const otpArray = randomOtp.split("");
    setOtp(otpArray);

    alert("Demo OTP: " + randomOtp);

    // auto verify demo
    setTimeout(() => {
      verifyOtp(randomOtp, randomOtp);
    }, 500);

  };

  /* OTP INPUT */

  const handleOtpChange = (value, index) => {

    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs.current[index + 1].focus();
    }

    if (newOtp.join("").length === 4) {
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

    const pasted = e.clipboardData.getData("text").slice(0, 4);

    if (!/^\d{4}$/.test(pasted)) return;

    const newOtp = pasted.split("");

    setOtp(newOtp);

    verifyOtp(pasted);

  };

  /* VERIFY OTP */

  const verifyOtp = (enteredOtp, realOtp = generatedOtp) => {

    if (locked) return;

    setLoading(true);

    setTimeout(() => {

      if (enteredOtp === realOtp) {

        localStorage.setItem("customerEmail", email);

        navigate(`/payment?theaterId=${theaterId}`);

      } else {

        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 3) {
          setLocked(true);
          setTimer(30);
        }

        alert("Invalid OTP");

        setOtp(["", "", "", ""]);
        inputRefs.current[0].focus();
      }

      setLoading(false);

    }, 1000);

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
            onChange={(e) => setEmail(e.target.value)}
            disabled={otpSent}
            className="mobile-input"
          />

          {!otpSent ? (

            <button
              onClick={handleSendOtp}
              className="primary-btn"
            >
              Send OTP
            </button>

          ) : (

            <>

              {/* OTP BOX */}

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

                    disabled={locked}
                  />

                ))}

              </div>

              {/* LOADING */}

              {loading && <div className="spinner"></div>}

              {/* TIMER */}

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