import React from "react";

const SessionExpiredUI = () => (
  <div style={{ 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center", 
    height: "100vh", 
    textAlign: "center",
    padding: "20px",
    background: "#fdfdfd"
  }}>
    <div style={{ fontSize: "60px", marginBottom: "20px" }}>⏳</div>
    <h2 style={{ color: "#333", fontSize: "24px", marginBottom: "10px" }}>Session Expired</h2>
    <p style={{ color: "#666", marginBottom: "30px", maxWidth: "400px" }}>
      Your session has timed out or is invalid. Please scan the QR code on your table to restart your order.
    </p>
    <button 
      onClick={() => window.location.href = "/"}
      style={{
        background: "#e61e2a",
        color: "#fff",
        border: "none",
        padding: "12px 30px",
        borderRadius: "30px",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
        boxShadow: "0 4px 15px rgba(230, 30, 42, 0.2)"
      }}
    >
      Scan QR Again
    </button>
  </div>
);

export default SessionExpiredUI;
