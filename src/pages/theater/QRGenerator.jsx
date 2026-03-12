import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useLocation } from "react-router-dom";
import "./QRGenerator.css";

const QRGenerator = () => {
  const { state } = useLocation();

  const loggedEmail = localStorage.getItem("loggedInUser");
  const role = localStorage.getItem("role");

  const [theaterData, setTheaterData] = useState(null);
  const [screenNo, setScreenNo] = useState("");
  const [seats, setSeats] = useState([]);

  const [rowName, setRowName] = useState("");
  const [seatCount, setSeatCount] = useState("");
  const [layout, setLayout] = useState([]);

  /* ===============================
     Detect Theater (Owner / Branch)
  =============================== */
  useEffect(() => {
    let theaters = JSON.parse(localStorage.getItem("theaters")) || [];

    if (!Array.isArray(theaters)) {
      theaters = Object.values(theaters);
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];

    let detectedTheater = null;

    /* BRANCH LOGIN */
    if (role === "BRANCH") {
      const branchUser = users.find((u) => u.email === loggedEmail);
      const branchTheaterId =
        branchUser?.theaterId || localStorage.getItem("branchTheaterId");

      detectedTheater = theaters.find(
        (t) => String(t.id) === String(branchTheaterId)
      );
    }

    /* OWNER LOGIN */
    if (role === "OWNER") {
      detectedTheater = theaters.find(
        (t) => t.ownerEmail === loggedEmail
      );
    }

    if (detectedTheater) {
      localStorage.setItem("activeTheaterId", detectedTheater.id);
    }

    setTheaterData(detectedTheater);
  }, [loggedEmail, role, state]);

  /* 🔒 Access Protection */
  if (role !== "OWNER" && role !== "BRANCH") {
    return <h3 style={{ padding: "20px" }}>Access Denied</h3>;
  }

  if (!theaterData) {
    return <h3 style={{ padding: "20px" }}>Loading Theater...</h3>;
  }

  /* ===============================
     Add Row
  =============================== */
  const addRow = () => {
    if (!rowName || !seatCount) {
      alert("Enter Row Name and Seat Count");
      return;
    }

    setLayout([
      ...layout,
      { row: rowName.toUpperCase(), count: Number(seatCount) },
    ]);

    setRowName("");
    setSeatCount("");
  };

  /* ===============================
     Generate Seats
  =============================== */
  const generateSeats = () => {
    if (!screenNo) {
      alert("Please select a screen");
      return;
    }

    if (layout.length === 0) {
      alert("Please add at least one row");
      return;
    }

    const allSeats = [];

    layout.forEach((r) => {
      for (let i = 1; i <= r.count; i++) {
        allSeats.push(`${r.row}${i}`);
      }
    });

    setSeats(allSeats);
  };

  /* ===============================
     Clear Layout
  =============================== */
  const clearLayout = () => {
    setLayout([]);
    setSeats([]);
    setScreenNo("");
    setRowName("");
    setSeatCount("");
  };

  return (
    <div className="qr-page">
      <h2>🎟 QR Generator</h2>

      <div className="qr-controls">

        {/* SCREEN SELECT */}
        <select
          value={screenNo}
          onChange={(e) => setScreenNo(e.target.value)}
        >
          <option value="">Select Screen</option>
          {Array.from(
            { length: theaterData.totalScreens || 0 },
            (_, i) => (
              <option key={i + 1} value={i + 1}>
                Screen {i + 1}
              </option>
            )
          )}
        </select>

        {/* ROW BUILDER */}
        <div className="row-builder">

          <input
            placeholder="Row (A, B, C)"
            value={rowName}
            onChange={(e) => setRowName(e.target.value)}
          />

          <input
            type="number"
            placeholder="Seats"
            value={seatCount}
            onChange={(e) => setSeatCount(e.target.value)}
          />

          <button className="add-row-btn" onClick={addRow}>
            Add Row
          </button>

        </div>

        {/* LAYOUT PREVIEW */}
        <div className="layout-preview">
          {layout.map((r, i) => (
            <p key={i}>
              Row {r.row} → {r.count} seats
            </p>
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div className="qr-action-buttons">

          <button
            className="generate-btn"
            onClick={generateSeats}
          >
            Generate Seats
          </button>

          <button
            className="clear-btn"
            onClick={clearLayout}
          >
            Clear
          </button>

        </div>

        {seats.length > 0 && (
          <button
            className="print-btn"
            onClick={() => window.print()}
          >
            Print QR Sheet
          </button>
        )}

      </div>

      {/* QR GRID */}
      <div className="qr-grid print-area">

        {seats.map((seat) => {

          const qrUrl =
            `http://localhost:5173/customer?theaterId=${theaterData.id}&screen=${screenNo}&seat=${seat}`;

          return (
            <div key={seat} className="qr-card">

              <QRCodeCanvas
                value={qrUrl}
                size={120}
              />

              <h4>Seat {seat}</h4>
              <p>Screen {screenNo}</p>
              <p>{theaterData.branch}</p>

            </div>
          );
        })}

      </div>
    </div>
  );
};

export default QRGenerator;