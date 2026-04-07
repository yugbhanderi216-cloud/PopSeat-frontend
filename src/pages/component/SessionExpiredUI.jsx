import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SessionExpiredUI = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. READ EXISTING PARAMS
    const theaterId = localStorage.getItem("customerTheaterId") || localStorage.getItem("theaterId") || "";
    const hallId = localStorage.getItem("customerHallId") || localStorage.getItem("hallId") || "";
    const seatId = localStorage.getItem("customerSeatId") || localStorage.getItem("seatId") || "";
    const seat = localStorage.getItem("seatNo") || "";

    // 2. REDIRECT FOR REFRESH
    if (theaterId && (seatId || seat)) {
      navigate(`/customer/welcome?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}&seat=${seat}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      justifyContent: "center", 
      height: "100vh", 
      background: "#fff" 
    }}>
      <p style={{ color: "#666" }}>Refreshing your table session...</p>
    </div>
  );
};

export default SessionExpiredUI;
