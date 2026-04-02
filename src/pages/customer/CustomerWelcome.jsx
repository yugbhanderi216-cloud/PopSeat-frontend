import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CustomerWelcome.css";

const API_BASE = "https://popseat.onrender.com/api";

const CustomerWelcome = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => {
    // 1. Try modern location.search first (?seatId=...)
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has("seatId") || searchParams.has("cinemaId")) {
      return searchParams;
    }

    // 2. Fallback to hash parameters for legacy QR codes (/#/customer/welcome?seatId=...)
    const hash = location.hash || "";
    const queryIndex = hash.indexOf("?");
    const queryString = queryIndex !== -1 ? hash.slice(queryIndex + 1) : "";
    return new URLSearchParams(queryString);
  }, [location]);

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("blob:")) return url;
    // Fallback for relative paths just in case
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
      console.error("No valid IDs found in URL params:", params.toString());
      setError("Invalid QR code. No valid seat or cinema data found.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {

      setLoading(true);
      setError("");

      try {
        if (seatId && hallId) {
          // 1. Fetch seats for this hall to find the one we scanned
          const res = await fetch(`${API_BASE}/seat?hallId=${hallId}`);
          const data = await res.json();

          const foundSeat = data.seats?.find(
            (s) => String(s._id) === String(seatId)
          );

          if (data.success && foundSeat) {
            // 2. Fetch cinema info using cinemaId from the seat/hall if available
            // If the seat doesn't have cinemaId, we might need to fetch the hall first
            // But let's check if we can get cinemaId from foundSeat.cinemaId or hallId
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
              // Fallback to generic name if we still don't have cinemaId
              setTheater({ theaterName: "Cinema" });
            }
          } else {
            setError("Seat not found. Please scan a valid QR code.");
          }

        } else if (cinemaId) {
          // If we have cinemaId directly, skip seat lookup and fetch branding
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

  const backgroundStyle = {
    backgroundImage: theater?.banner
      ? `url(${getImageUrl(theater.banner)})`
      : "linear-gradient(135deg,#b8a899,#9f8e7f)",
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

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

  return (

    <div className="welcome-container" style={backgroundStyle}>

      <div className="welcome-glass">

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
            🎞 Screen: <b>{screen || "Unknown"}</b>
          </div>

          <div className="info-item">
            💺 Seat: <b>{seat || "Unknown"}</b>
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