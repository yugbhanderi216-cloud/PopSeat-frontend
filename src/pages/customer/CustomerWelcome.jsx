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


  /* ── Loading ── */
  if (loading) {
    return (
      <div className="welcome-container">
        <div className="welcome-glass">
          <div className="logo-placeholder">🎬</div>
          <h1 className="welcome-title" style={{ marginTop: 8 }}>Loading…</h1>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="welcome-container">
        <div className="welcome-glass">
          <div className="logo-placeholder">⚠️</div>
          <h1 className="welcome-title" style={{ marginTop: 8 }}>Oops!</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  /* ── Main ── */
  return (
    <div className="welcome-container">
      <div className="welcome-glass">

        {/* Logo */}
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

        {/* Title */}
        <h1 className="welcome-title">
          Welcome to {theater?.theaterName || "Cinema"}
        </h1>

        {/* Branch + City */}
        {theater?.branch && theater.branch !== theater.theaterName && (
          <p className="welcome-branch">
            {theater.branch}
            <span className="dot" />
            {theater.city}
          </p>
        )}

        {/* Info box */}
        <div className="welcome-info-box">

          <div className="info-row">
            <span className="info-label">
              <span className="info-icon">🎞</span>
              Screen
            </span>
            <span className="info-value">{screen || "Unknown"}</span>
          </div>

          <div className="info-divider" />

          <div className="info-row">
            <span className="info-label">
              <span className="info-icon">💺</span>
              Seat
            </span>
            <span className="info-value">{seat || "Unknown"}</span>
          </div>

          {type && (
            <div style={{ textAlign: "center", paddingTop: 4 }}>
              <span className={`seat-badge ${type.toLowerCase()}`}>
                {type} Class
              </span>
            </div>
          )}

        </div>

        {/* CTA */}
        <button className="order-btn-modern" onClick={handleOrderNow}>
          🍿 Start Ordering
        </button>

      </div>
    </div>
  );
};

export default CustomerWelcome;