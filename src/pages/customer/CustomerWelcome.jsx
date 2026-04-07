import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SessionExpiredUI from "../component/SessionExpiredUI";
import "./CustomerWelcome.css";

const API_BASE = "https://popseat.onrender.com/api";

const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("blob:")) return url;
  return `https://popseat.onrender.com/${url.replace(/^\//, "")}`;
};

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

  const theaterId = params.get("theaterId") || params.get("cinemaId") || localStorage.getItem("theaterId");
  const hallId = params.get("hallId") || localStorage.getItem("customerHallId");
  const seatId = params.get("seatId") || localStorage.getItem("customerSeatId");
  const seatName = params.get("seat") || localStorage.getItem("seatNo");
  const screen = params.get("screen") || localStorage.getItem("screenNo");

  // Sync with localStorage
  useEffect(() => {
    if (theaterId) localStorage.setItem("theaterId", theaterId);
    if (hallId) localStorage.setItem("hallId", hallId);
    if (seatId) localStorage.setItem("seatId", seatId);
    if (seatName) localStorage.setItem("seatNo", seatName);
    if (screen) localStorage.setItem("screenNo", screen);
  }, [theaterId, hallId, seatId, seatName, screen]);

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
      // Note: If this 404s, it means the backend route isn't registered yet.
      // We will proceed anyway using the QR parameters directly.
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

      // 2. CRITICAL ERROR CHECK: If 400 (Bad Request), the IDs are missing/invalid.
      // We must stop and show an error to prevent loading incorrect cached data.
      if (res.status === 400) {
        setError(true);
        return false;
      }

      // 3. FALLBACK BYPASS: If 404 (Not Found), the backend endpoint isn't ready.
      // We proceed using URL params directly so the user isn't stuck.
      return true; 
    } catch (err) {
      console.warn("Session bypass active due to network/endpoint issue:", err);
      return true;
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
    navigate(`/customer/menu?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}&seat=${seatName}&screen=${screen}`);
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
  const logoData = theater?.theaterLogo || theater?.logo || theater?.logoUrl || "";
  const logoUrl = logoData.startsWith("data:") ? logoData : getImageUrl(logoData);
  
  const name = theater?.name || "Welcome to Cinema";
  const branch = theater?.branchName || "Main Branch";
  const city = theater?.city || theater?.location || "Theater";

  return (
    <div className="welcome-container">
      <main className="welcome-main-card">
        {/* Concave Header with Theater Logo */}
        <div className="welcome-header-card">
          <div className="welcome-logo-container">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Theater Logo"
                className="welcome-logo-modern"
                onError={(e) => e.target.style.display = 'none'}
              />
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
              <span className="info-value">{screen || "---"}</span>
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
