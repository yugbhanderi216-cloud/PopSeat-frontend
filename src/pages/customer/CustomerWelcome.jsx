import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomerWelcome.css";

const API_BASE = "https://popseat.onrender.com/api";

const CustomerWelcome = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);

  const seatId = params.get("seatId");
  const screen = params.get("screen");
  const seat   = params.get("seat");
  const type   = params.get("type");

  const [theater, setTheater] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  /* ===============================
     SAVE CUSTOMER DATA
  =============================== */

  useEffect(() => {

    if (screen) localStorage.setItem("screenNo", screen);
    if (seat)   localStorage.setItem("seatNo", seat);
    if (type)   localStorage.setItem("seatType", type);

    // FIX: was saving as "seatId" but CustomerCart reads "customerSeatId"
    if (seatId) localStorage.setItem("customerSeatId", seatId);

  }, [screen, seat, seatId, type]);

  /* ===============================
     LOAD THEATER — GET /api/seat/:id
  =============================== */

  useEffect(() => {

    if (!seatId) {
      setError("Invalid QR code. No seat ID found.");
      setLoading(false);
      return;
    }

    const fetchSeatData = async () => {

      setLoading(true);
      setError("");

      try {

        const res  = await fetch(`${API_BASE}/seat/${seatId}`);
        const data = await res.json();

        if (data.success && data.seat?.hallId?.cinemaId) {

          const cinema = data.seat.hallId.cinemaId;

          setTheater({
            theaterName : cinema.name,
            banner      : cinema.banner,
            logo        : cinema.theaterLogo,
            branch      : cinema.branchName,
            city        : cinema.city,
          });

          // FIX: save theaterId (cinema._id) so CustomerMenu + CustomerCart
          // can use it for navigation and order payload
          if (cinema._id) {
            localStorage.setItem("customerTheaterId", cinema._id);
          }

        } else if (data.success && !data.seat?.hallId) {

          // Seat exists but not assigned to a hall/cinema yet
          setError("This seat is not linked to a theater yet. Please contact staff.");

        } else {
          setError("Seat not found. Please scan a valid QR code.");
        }

      } catch (err) {
        console.error("Error loading theater:", err);
        setError("Network error. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }

    };

    fetchSeatData();

  }, [seatId]);

  /* ===============================
     ORDER BUTTON
  =============================== */

  const handleOrderNow = () => {

    const theaterId = localStorage.getItem("customerTheaterId") || "";

    navigate(
      `/customer/menu?theaterId=${theaterId}&seatId=${seatId}&screen=${screen}&seat=${seat}&type=${type}`
    );

  };

  /* ===============================
     BACKGROUND
  =============================== */

  const backgroundStyle = {
    backgroundImage: theater?.banner
      ? `url(${theater.banner})`
      : "linear-gradient(135deg,#b8a899,#9f8e7f)",
    backgroundSize    : "cover",
    backgroundPosition: "center",
  };

  /* ===============================
     LOADING STATE
  =============================== */

  if (loading) {
    return (
      <div className="welcome-container">
        <div className="welcome-glass">
          <div className="logo-placeholder">🎬</div>
          <h2 style={{ color: "#fff", marginTop: 16 }}>Loading...</h2>
        </div>
      </div>
    );
  }

  /* ===============================
     ERROR STATE
  =============================== */

  if (error) {
    return (
      <div className="welcome-container">
        <div className="welcome-glass">
          <div className="logo-placeholder">⚠️</div>
          <h2 style={{ color: "#fff", marginTop: 16 }}>Oops!</h2>
          <p style={{ color: "#ffd", textAlign: "center", marginTop: 8 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  /* ===============================
     RENDER
  =============================== */

  return (

    <div className="welcome-container" style={backgroundStyle}>

      <div className="welcome-glass">

        {theater?.logo ? (

          <img
            src={theater.logo}
            alt="Theater Logo"
            className="welcome-logo-modern"
          />

        ) : (

          <div className="logo-placeholder">🎬</div>

        )}

        <h1 className="welcome-title">
          Welcome to {theater?.theaterName || "Cinema"}
        </h1>

        {theater?.branch && theater.branch !== theater.theaterName && (
          <p style={{ color: "#eee", fontSize: "13px", marginTop: -8, marginBottom: 8 }}>
            {theater.branch} • {theater.city}
          </p>
        )}

        <div className="welcome-info-box">

          <div className="info-item">
            🎞 Screen: <b>{screen}</b>
          </div>

          <div className="info-item">
            💺 Seat: <b>{seat}</b>
          </div>

          {type && (
            <div className={`seat-badge ${type.toLowerCase()}`}>
              {type} Class
            </div>
          )}

        </div>

        <button
          className="order-btn-modern"
          onClick={handleOrderNow}
        >
          🍿 Start Ordering
        </button>

      </div>

    </div>

  );

};

export default CustomerWelcome;