import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomerWelcome.css";

const API_BASE = "https://popseat.onrender.com/api";

const CustomerWelcome = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has("seatId") || searchParams.has("cinemaId")) {
      return searchParams;
    }
    const hash = location.hash || "";
    const queryIndex = hash.indexOf("?");
    const queryString = queryIndex !== -1 ? hash.slice(queryIndex + 1) : "";
    return new URLSearchParams(queryString);
  }, [location]);

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("blob:")) return url;
    return `https://popseat.onrender.com/${url.replace(/^\//, "")}`;
  };

  const seatId = params.get("seatId");
  const cinemaId = params.get("cinemaId");
  const hallId = params.get("hallId");
  const screen = params.get("screen");
  const seat = params.get("seat");
  const type = params.get("type");

  const [theater, setTheater] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (screen) localStorage.setItem("screenNo", screen);
    if (seat) localStorage.setItem("seatNo", seat);
    if (type) localStorage.setItem("seatType", type);
    if (cinemaId) localStorage.setItem("customerTheaterId", cinemaId);
    if (hallId) localStorage.setItem("customerHallId", hallId);
    if (seatId) localStorage.setItem("customerSeatId", seatId);
  }, [screen, seat, seatId, cinemaId, hallId, type]);

  useEffect(() => {
    if (!seatId && !cinemaId) {
      setError("Invalid QR code. No valid seat or cinema data found.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        if (seatId && hallId) {
          const res = await fetch(`${API_BASE}/seat?hallId=${hallId}`);
          const data = await res.json();

          const foundSeat = data.seats?.find(
            (s) => String(s._id) === String(seatId)
          );

          if (data.success && foundSeat) {
            const cId = foundSeat.cinemaId || cinemaId;
            if (cId) {
              const cRes = await fetch(`${API_BASE}/cinema/${cId}`);
              const cData = await cRes.json();
              if (cData.success && cData.cinema) {
                const cinema = cData.cinema;
                setTheater({
                  theaterName: cinema.name,
                  banner: cinema.banner,
                  logo: cinema.theaterLogo,
                  branch: cinema.branchName,
                  city: cinema.city,
                });
                localStorage.setItem("customerTheaterId", cinema._id);
              }
            } else {
              setTheater({ theaterName: "Cinema" });
            }
          } else {
            setError("Seat not found. Please scan a valid QR code.");
          }

        } else if (cinemaId) {
          const res = await fetch(`${API_BASE}/cinema/${cinemaId}`);
          const data = await res.json();

          if (res.ok && data.success && data.cinema) {
            const cinema = data.cinema;
            setTheater({
              theaterName: cinema.name,
              banner: cinema.banner,
              logo: cinema.theaterLogo,
              branch: cinema.branchName,
              city: cinema.city,
            });
            localStorage.setItem("customerTheaterId", cinema._id);
          } else {
            setError("Theater not found. Please scan a valid QR code.");
          }
        }

      } catch (err) {
        console.error("Error loading theater:", err);
        setError("Network error. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [seatId, cinemaId, hallId]);

  const handleOrderNow = () => {
    const finalTheaterId = localStorage.getItem("customerTheaterId") || cinemaId || "";
    const finalHallId = localStorage.getItem("customerHallId") || hallId || "";
    const finalSeatId = localStorage.getItem("customerSeatId") || seatId || "";

    navigate(
      `/customer/menu?theaterId=${finalTheaterId}&hallId=${finalHallId}&seatId=${finalSeatId}&screen=${screen || ""}&seat=${seat || ""}&type=${type || ""}`
    );
  };


  /* ── Error View ── */

  /* ── Error View ── */
  if (error) {
    return (
      <div className="welcome-container" style={{ justifyContent: 'center' }}>
        <div className="welcome-glass">
          <div className="logo-placeholder">⚠️</div>
          <h1 className="welcome-theater-name" style={{ marginTop: 16 }}>Oops!</h1>
          <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  /* ── Main View ── */
  return (
    <div className="welcome-container">
      
      {/* Central Card */}
      <div className="welcome-main-card">
        
        {/* Header with Concave Curve */}
        <header className="welcome-header-card">
          <div className="welcome-logo-container">
            {theater?.logo ? (
              <img
                src={getImageUrl(theater.logo)}
                alt="Theater Logo"
                className="welcome-logo-modern"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div className="logo-placeholder">🎬</div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="welcome-content-section">
          
          <h1 className="welcome-theater-name">
            {theater?.theaterName || "Welcome"}
          </h1>

          <div className="welcome-location">
            {theater?.branch}
            <span className="dot" />
            {theater?.city}
          </div>

          {/* Info Box (Screen & Seat) */}
          <div className="welcome-info-box">
            
            <div className="info-item">
              <div className="info-label-group">
                <div className="info-icon">🎞️</div>
                <span className="info-label">Screen</span>
              </div>
              <span className="info-value">{screen || "---"}</span>
            </div>

            <div className="info-item">
              <div className="info-label-group">
                <div className="info-icon">💺</div>
                <span className="info-label">Seat</span>
              </div>
              <span className="info-value">{seat || "---"}</span>
            </div>

          </div>

          {/* Circular Action Button */}
          <button 
            className="welcome-arrow-button" 
            onClick={handleOrderNow}
            aria-label="Start Ordering"
          >
            <div className="arrow-icon">→</div>
          </button>

        </main>
      </div>

    </div>
  );
};

export default CustomerWelcome;