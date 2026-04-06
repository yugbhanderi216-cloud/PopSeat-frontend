import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SessionExpiredUI from "../component/SessionExpiredUI";

const API_BASE = "https://popseat.onrender.com/api";

const CustomerWelcome = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  const params = new URLSearchParams(location.search);
  const theaterId = params.get("theaterId");
  const hallId = params.get("hallId");
  const seatId = params.get("seatId");
  const seat = params.get("seat");

  useEffect(() => {
    const initSession = async () => {
      // Always create session on first page load from QR
      if (theaterId && hallId && seatId && seat) {
        try {
          const res = await fetch(`${API_BASE}/session/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              theaterId,
              hallId,
              seatId,
              seatNumber: seat
            })
          });

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          const data = await res.json();
          if (res.status === 201 && data.success) {
            localStorage.setItem("sessionId", data.sessionId);
            localStorage.setItem("theaterId", theaterId);
            localStorage.setItem("hallId", hallId);
            localStorage.setItem("seatId", seatId);
            localStorage.setItem("seatNo", seat);
            
            setTimeout(() => {
              navigate("/customer/menu");
            }, 1000);
          } else {
            console.error("Session creation failed", data);
            setError(true);
          }
        } catch (err) {
          console.error("API Error:", err);
          setError(true);
        }
      } else {
        // Missing URL parameters
        // Check if session already exists
        const existingSession = localStorage.getItem("sessionId");
        if (!existingSession) {
          // If no sessionId in localStorage but we have raw params in localStorage, automatically call /session/create again
          const tId = localStorage.getItem("theaterId");
          const hId = localStorage.getItem("hallId");
          const sId = localStorage.getItem("seatId");
          const sNo = localStorage.getItem("seatNo");
          if (tId && hId && sId && sNo) {
             try {
               const res = await fetch(`${API_BASE}/session/create`, {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ theaterId: tId, hallId: hId, seatId: sId, seatNumber: sNo })
               });
               
               if (!res.ok) {
                   throw new Error(`HTTP error! status: ${res.status}`);
               }
               const data = await res.json();
               if (res.status === 201 && data.success) {
                 localStorage.setItem("sessionId", data.sessionId);
                 setTimeout(() => navigate("/customer/menu"), 1000);
               } else {
                 setError(true);
               }
             } catch (e) {
               console.error("Session reinit error:", e);
               setError(true);
             }
          } else {
            setError(true);
          }
        } else {
          setTimeout(() => {
            navigate("/customer/menu");
          }, 1000);
        }
      }
    };
    
    initSession();
  }, [theaterId, hallId, seatId, seat, navigate]);

  if (error) {
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
