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
  const seat = params.get("seat");
  const type = params.get("type");

  const [theater, setTheater] = useState(null);

  /* ===============================
     SAVE CUSTOMER DATA
  =============================== */

  useEffect(() => {

    if (screen) localStorage.setItem("screenNo", screen);
    if (seat) localStorage.setItem("seatNo", seat);
    if (seatId) localStorage.setItem("seatId", seatId);
    if (type) localStorage.setItem("seatType", type);

  }, [screen, seat, seatId, type]);

  /* ===============================
     LOAD THEATER FROM API
  =============================== */

  useEffect(() => {

    const fetchSeatData = async () => {

      try {

        const res = await fetch(`${API_BASE}/seat/${seatId}`);
        const data = await res.json();

        if (data.success && data.seat?.hallId?.cinemaId) {

          const cinema = data.seat.hallId.cinemaId;

          setTheater({
            theaterName: cinema.name,
            banner: cinema.banner,
            logo: cinema.theaterLogo,
            branch: cinema.branchName,
            city: cinema.city
          });

        }

      } catch (error) {
        console.error("Error loading theater:", error);
      }

    };

    if (seatId) fetchSeatData();

  }, [seatId]);

  /* ===============================
     ORDER BUTTON
  =============================== */

  const handleOrderNow = () => {

    navigate(
      `/customer/menu?seatId=${seatId}&screen=${screen}&seat=${seat}&type=${type}`
    );

  };

  /* ===============================
     BACKGROUND
  =============================== */

  const backgroundStyle = {
    backgroundImage: theater?.banner
      ? `url(${theater.banner})`
      : "linear-gradient(135deg,#b8a899,#9f8e7f)",
    backgroundSize: "cover",
    backgroundPosition: "center"
  };

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

          <div className="logo-placeholder">
            🎬
          </div>

        )}

        <h1 className="welcome-title">
          Welcome to {theater?.theaterName || "Cinema"}
        </h1>

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