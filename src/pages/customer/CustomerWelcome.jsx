import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SessionExpiredUI from "../component/SessionExpiredUI";

const API_BASE = "https://popseat.onrender.com/api";

const CustomerWelcome = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  const params = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);

    // Handle both normal and hash routing
    if (searchParams.has("seatId") || searchParams.has("cinemaId") || searchParams.has("theaterId")) {
      return searchParams;
    }

    const hash = location.hash || "";
    const queryIndex = hash.indexOf("?");
    const queryString = queryIndex !== -1 ? hash.slice(queryIndex + 1) : "";

    return new URLSearchParams(queryString);
  }, [location]);

  const theaterId =
    params.get("theaterId") ||
    params.get("cinemaId") ||
    localStorage.getItem("customerTheaterId");

  const hallId =
    params.get("hallId") ||
    localStorage.getItem("customerHallId");

  const seatId =
    params.get("seatId") ||
    localStorage.getItem("customerSeatId");

  const seat =
    params.get("seat") ||
    localStorage.getItem("seatNo");
  useEffect(() => {
    if (theaterId) localStorage.setItem("customerTheaterId", theaterId);
    if (hallId) localStorage.setItem("customerHallId", hallId);
    if (seatId) localStorage.setItem("customerSeatId", seatId);
    if (seat) localStorage.setItem("seatNo", seat);
  }, [theaterId, hallId, seatId, seat]);

  const createSession = async () => {
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

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid JSON response");
      }

      if (res.status === 201 && data.success) {
        localStorage.setItem("sessionId", data.sessionId);
        return true;
      }

      throw new Error(data.message || "Session failed");
    } catch (err) {
      console.error("Session error:", err);
      return false;
    }
  };

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let isMounted = true;

    const init = async () => {
      if (!theaterId || !hallId || !seatId || !seat) {
        setTimeout(() => {
          if (!theaterId || !hallId || !seatId || !seat) {
            setError(true);
          }
        }, 500);
        return;
      }

      const existingSession = localStorage.getItem("sessionId");

      if (existingSession) {
        navigate("/customer/menu");
        return;
      }

      const success = await createSession();

      if (!isMounted) return;

      if (success) {
        navigate("/customer/menu");
      } else {
        setError(true);
      }
    };
    init();

    return () => {
      isMounted = false;
    };
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
