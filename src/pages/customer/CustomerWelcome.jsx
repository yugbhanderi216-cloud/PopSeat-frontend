import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomerWelcome.css";

const CustomerWelcome = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);

  const theaterId = params.get("theaterId");
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
    if (theaterId) localStorage.setItem("customerTheaterId", theaterId);
    if (type) localStorage.setItem("seatType", type);

  }, [screen, seat, theaterId, type]);

  /* ===============================
     LOAD THEATER DATA
  =============================== */

  useEffect(() => {

    let theaters = JSON.parse(localStorage.getItem("theaters")) || [];

    if (!Array.isArray(theaters)) {
      theaters = Object.values(theaters);
    }

    const found = theaters.find(
      (t) => String(t.id) === String(theaterId)
    );

    setTheater(found);

  }, [theaterId]);

  /* ===============================
     ORDER BUTTON
  =============================== */

  const handleOrderNow = () => {

    navigate(
      `/customer/menu?theaterId=${theaterId}&screen=${screen}&seat=${seat}&type=${type}`
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
          Welcome to {theater?.theaterName}
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