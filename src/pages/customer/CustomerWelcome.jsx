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
      // 1. TRY ORIGINAL SESSION CREATE (POST)
      const res = await fetch(`${API_BASE}/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theaterId, hallId, seatId, seatNumber: seat })
      });

      if (res.status === 201) {
        const data = await res.json();
        if (data.success && data.sessionId) {
          localStorage.setItem("sessionId", data.sessionId);
          return true;
        }
      }

      // 2. FALLBACK: TRY SEAT VALIDATION (GET)
      // Documentation matches: /api/customer/theaters/:theaterId/seats/:seatId
      const validRes = await fetch(`${API_BASE}/customer/theaters/${theaterId}/seats/${seatId}`);
      
      if (validRes.ok) {
        const validData = await validRes.json();
        // If validation returns a sessionId or token, use it
        if (validData.sessionId || validData.token) {
          localStorage.setItem("sessionId", validData.sessionId || validData.token);
          return true;
        }
        // If validation succeeds but no sessionId, we still proceed (Bypass Blocking)
        return true;
      }

      // 3. LAST RESORT: IF WE HAVE PARAMS, JUST PROCEED WITHOUT SESSION
      // (This addresses the user's feedback about removing the expiration block)
      if (theaterId && hallId && seatId && seat) {
        console.log("Proceeding without backend session via local parameters.");
        return true; 
      }

      return false;
    } catch (err) {
      console.error("Session initialization failed:", err);
      // Still bypass if we have enough local info
      return !!(theaterId && hallId && seatId && seat);
    }
  };

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let isMounted = true;

    const init = async () => {
      // Clear error immediately on new scan
      setError(false);

      if (!theaterId || !hallId || !seatId || !seat) {
        setTimeout(() => {
          if (!theaterId || !hallId || !seatId || !seat) {
            setError(true);
          }
        }, 800);
        return;
      }

      // Check if we already have a session, but still verify if needed
      const existingSession = localStorage.getItem("sessionId");

      // If we have everything, we attempt to initialize/refresh with backend
      const success = await createSession();

      if (!isMounted) return;

      if (success || existingSession) {
        // We proceed if createSession succeeded OR if we have an existing session
        // This ensures a "smooth" experience even if the backend call fails
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
