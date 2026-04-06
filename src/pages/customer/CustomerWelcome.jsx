import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import SessionExpiredUI from "../component/SessionExpiredUI";

const CustomerWelcome = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const sessionToken = params.get("sessionToken");

  useEffect(() => {
    if (sessionToken) {
      try {
        sessionStorage.setItem("sessionToken", sessionToken);
        const decoded = jwtDecode(sessionToken);

        localStorage.setItem("theaterId", decoded.theaterId);
        localStorage.setItem("seatId", decoded.seatId);
        localStorage.setItem("hallId", decoded.hallId);
        
        // Automated redirect to menu after successful extraction
        setTimeout(() => {
          navigate("/customer/menu");
        }, 1500);
      } catch (err) {
        console.error("Invalid session token:", err);
      }
    }
  }, [sessionToken, navigate]);

  if (!sessionToken) {
    return <SessionExpiredUI />;
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh",
      background: "#fff" 
    }}>
      <div className="welcome-loader">
        <div style={{ fontSize: "24px", fontWeight: "600", color: "#e61e2a" }}>
          Welcome to PopSeat
        </div>
        <p style={{ color: "#888" }}>Setting up your table...</p>
      </div>
    </div>
  );
};

export default CustomerWelcome;
