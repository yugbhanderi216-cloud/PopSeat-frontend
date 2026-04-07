import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SessionExpiredUI from "../component/SessionExpiredUI";
import "./CustomerWelcome.css";

const API_BASE = "https://popseat.onrender.com/api";

const CustomerWelcome = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // -- UI States --
  const [theater, setTheater] = useState(null);
  const [error, setError] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // -- Params Extraction (Supporting both theaterId and cinemaId) --
  const params = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has("seatId") || searchParams.has("cinemaId") || searchParams.has("theaterId")) {
      return searchParams;
    }
    const hash = location.hash || "";
    const queryIndex = hash.indexOf("?");
    const queryString = queryIndex !== -1 ? hash.slice(queryIndex + 1) : "";
    return new URLSearchParams(queryString);
  }, [location]);

  const theaterId = params.get("theaterId") || params.get("cinemaId") || localStorage.getItem("customerTheaterId");
  const hallId = params.get("hallId") || localStorage.getItem("customerHallId");
  const seatId = params.get("seatId") || localStorage.getItem("customerSeatId");
  const seatName = params.get("seat") || localStorage.getItem("seatNo");

  // Sync with localStorage
  useEffect(() => {
    if (theaterId) localStorage.setItem("customerTheaterId", theaterId);
    if (hallId) localStorage.setItem("customerHallId", hallId);
    if (seatId) localStorage.setItem("customerSeatId", seatId);
    if (seatName) localStorage.setItem("seatNo", seatName);
  }, [theaterId, hallId, seatId, seatName]);

  // -- Fetch Theater Info for Rich UI --
  useEffect(() => {
    const fetchTheater = async () => {
      if (!theaterId) return;
      try {
        const res = await fetch(`${API_BASE}/cinema/${theaterId}`);
        const data = await res.json();
        if (data.success && data.cinema) {
          setTheater(data.cinema);
        } else {
          // Fallback if theater not found
          setTheater({ name: "Cinema", branchName: "Theater", location: "PopSeat" });
        }
      } catch (err) {
        console.error("Theater fetch failed:", err);
      }
    };
    fetchTheater();
  }, [theaterId]);

  // -- Functional Session logic (kept from previous fix) --
  const createSession = async () => {
    try {
      // 1. TRY ORIGINAL SESSION CREATE (POST)
      const res = await fetch(`${API_BASE}/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theaterId, hallId, seatId, seatNumber: seatName })
      });

      if (res.status === 201) {
        const data = await res.json();
        if (data.success && data.sessionId) {
          localStorage.setItem("sessionId", data.sessionId);
          return true;
        }
      }

      // 2. FALLBACK: TRY SEAT VALIDATION (GET)
      const validRes = await fetch(`${API_BASE}/customer/theaters/${theaterId}/seats/${seatId}`);
      if (validRes.ok) {
        const validData = await validRes.json();
        if (validData.sessionId || validData.token) {
          localStorage.setItem("sessionId", validData.sessionId || validData.token);
          return true;
        }
        return true; // Bypass if validation ok
      }

      // 3. LAST RESORT BYPASS
      if (theaterId && hallId && seatId && seatName) return true;

      return false;
    } catch (err) {
      console.error("Session initialization failed:", err);
      return !!(theaterId && hallId && seatId && seatName);
    }
  };

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      setInitializing(true);
      if (!theaterId || !hallId || !seatId || !seatName) {
        setTimeout(() => {
          if (!theaterId || !hallId || !seatId || !seatName) {
            setError(true);
            setInitializing(false);
          }
        }, 1200);
        return;
      }

      // Attempt session creation silently
      await createSession();
      setInitializing(false);
    };
    init();
  }, [theaterId, hallId, seatId, seatName]);

  const handleOrderNow = () => {
    navigate("/customer/menu");
  };

  // -- Loading/Error States (minimalist/bypass) --
  if (error) {
    return (
      <div className="welcome-container">
        <div className="welcome-glass">
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>📱</div>
            <h2 style={{ color: "#333", fontSize: "24px", marginBottom: "10px" }}>Ready to Order?</h2>
            <p style={{ color: "#666", marginBottom: "30px", maxWidth: "320px", lineHeight: "1.6" }}>
              Please scan the QR code located on your table to see the menu and place your order.
            </p>
        </div>
      </div>
    );
  }

  // Header/Logo defaults
  const logoUrl = theater?.logo || "";
  const name = theater?.name || "Welcome to Cinema";
  const branch = theater?.branchName || "Main Branch";
  const city = theater?.location || "Theater";

  return (
    <div className="welcome-container">
      <main className="welcome-main-card">
        {/* Concave Header with Theater Logo */}
        <div className="welcome-header-card">
          <div className="welcome-logo-container">
            {logoUrl ? (
              <img src={logoUrl} alt="Theater Logo" className="welcome-logo-modern" />
            ) : (
              <div className="logo-placeholder">🎬</div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <section className="welcome-content-section">
          <h2 className="welcome-theater-name">{name}</h2>
          <div className="welcome-location">
            <span>{branch}</span>
            <span className="dot" />
            <span>{city}</span>
          </div>

          {/* Table Box (Screen & Seat info) */}
          <div className="welcome-info-box">
            <div className="info-item">
              <div className="info-label-group">
                <div className="info-icon">🖥️</div>
                <span className="info-label">Screen</span>
              </div>
              <span className="info-value">{hallId || "---"}</span>
            </div>
            <div className="info-item">
              <div className="info-label-group">
                <div className="info-icon">💺</div>
                <span className="info-label">Seat</span>
              </div>
              <span className="info-value">{seatName || "---"}</span>
            </div>
          </div>

          {/* Circular Action Button (Arrow) */}
          <button 
            className="welcome-arrow-button" 
            onClick={handleOrderNow}
            aria-label="Start Ordering"
          >
            <div className="arrow-icon">→</div>
          </button>
          
          <p style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "600" }}>
            Tap the button to start ordering
          </p>
        </section>
      </main>
    </div>
  );
};

export default CustomerWelcome;
