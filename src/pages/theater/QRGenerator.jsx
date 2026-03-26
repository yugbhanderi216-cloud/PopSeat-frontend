import React, { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QRGenerator.css";

// ─────────────────────────────────────────────────────────────
// APIs USED:
//   GET  /api/cinema/:theaterId  ✅ — load one specific theater
//   GET  /api/hall               ✅ — load halls for theaterId
//   POST /api/seat               ✅ — create seat, returns _id
//   GET  /api/seat               ✅ — list existing seats (dedup)
//
// QR URL points to CustomerWelcome route:
//   /customer/welcome?seatId=<_id>&screen=<screenNo>&seat=<seatNumber>
//   CustomerWelcome calls GET /api/seat/:id to load theater info.
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://popseat.onrender.com/api";
const APP_BASE = window.location.origin;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    localStorage.getItem("ownerToken") || localStorage.getItem("token") || ""
  }`,
});

const QRGenerator = () => {
  const { state } = useLocation();
  const navigate  = useNavigate();

  const ownerEmail = localStorage.getItem("ownerEmail") || localStorage.getItem("email") || "";
  const role       = (localStorage.getItem("ownerRole") || localStorage.getItem("role") || "").toLowerCase();

  // Resolve theaterId once — prefer navigation state, fall back to localStorage
  const theaterId =
    state?.theaterId ||
    localStorage.getItem("activeOwnerTheaterId") ||
    localStorage.getItem("customerTheaterId") ||
    "";

  const [theaterData,    setTheaterData]    = useState(null);
  const [halls,          setHalls]          = useState([]);
  const [selectedHall,   setSelectedHall]   = useState("");
  const [screenNo,       setScreenNo]       = useState("");
  const [generatedSeats, setGeneratedSeats] = useState([]);

  const [rowName,   setRowName]   = useState("");
  const [seatCount, setSeatCount] = useState("");
  const [layout,    setLayout]    = useState([]);

  const [theaterLoading, setTheaterLoading] = useState(true);
  const [hallLoading,    setHallLoading]    = useState(false);
  const [generating,     setGenerating]     = useState(false);
  const [error,          setError]          = useState("");
  const [progress,       setProgress]       = useState("");

  // ── Auth guard ──
  useEffect(() => {
    if (!ownerEmail || (role !== "owner" && role !== "worker")) {
      navigate("/login", { replace: true });
    }
  }, [ownerEmail, role, navigate]);

  // ─────────────────────────────────────────────────────────
  //  LOAD THEATER — GET /api/cinema/:theaterId
  //
  //  FIX: was calling GET /api/cinema (all cinemas) and then
  //  filtering by email — unreliable if owner has multiple
  //  theaters or if email fields differ across records.
  //  theaterId is already available from navigation state and
  //  localStorage, so we call the specific endpoint directly.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTheater = async () => {
      setTheaterLoading(true);
      setError("");

      if (!theaterId) {
        setError("No theater selected. Please go back and select a theater.");
        setTheaterLoading(false);
        return;
      }

      try {
        const res  = await fetch(`${API_BASE}/cinema/${theaterId}`, {
          headers: authHeaders(),
        });
        const data = await res.json();

        if (res.ok && data.success && data.cinema) {
          setTheaterData(data.cinema);
        } else if (res.status === 404) {
          setError("Theater not found. Please go back and select a valid theater.");
        } else {
          setError(data.message || "Failed to load theater.");
        }
      } catch (err) {
        console.error("Theater fetch error:", err);
        setError("Network error. Could not load theater.");
      } finally {
        setTheaterLoading(false);
      }
    };

    if (ownerEmail) fetchTheater();
  }, [theaterId, ownerEmail]);

  // ─────────────────────────────────────────────────────────
  //  LOAD HALLS — GET /api/hall?cinemaId=:theaterId
  // ─────────────────────────────────────────────────────────
  const loadHalls = useCallback(async (cinemaId) => {
    setHallLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/hall?cinemaId=${cinemaId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();

      if (data.success) {
        const cinemaHalls = (data.halls || []).filter(
          (h) => h.cinemaId === cinemaId || h.cinemaId?._id === cinemaId
        );
        setHalls(cinemaHalls);
        // Auto-select the only hall if there is just one
        if (cinemaHalls.length === 1) {
          setSelectedHall(cinemaHalls[0]._id);
          setScreenNo(cinemaHalls[0].hallNumber || "1");
        }
      }
    } catch (err) {
      console.warn("Hall fetch error:", err);
    } finally {
      setHallLoading(false);
    }
  }, []);

  useEffect(() => {
    if (theaterData?._id) loadHalls(theaterData._id);
  }, [theaterData, loadHalls]);

  // ─────────────────────────────────────────────────────────
  //  ROW BUILDER
  // ─────────────────────────────────────────────────────────
  const addRow = () => {
    if (!rowName.trim() || !seatCount) {
      setError("Enter both a row name and seat count.");
      return;
    }
    if (Number(seatCount) < 1 || Number(seatCount) > 50) {
      setError("Seat count must be between 1 and 50.");
      return;
    }
    setLayout([
      ...layout,
      { row: rowName.trim().toUpperCase(), count: Number(seatCount) },
    ]);
    setRowName("");
    setSeatCount("");
    setError("");
  };

  const removeRow = (i) => setLayout(layout.filter((_, idx) => idx !== i));

  // ─────────────────────────────────────────────────────────
  //  GENERATE SEATS — POST /api/seat (one per seat)
  // ─────────────────────────────────────────────────────────
  const generateSeats = async () => {
    setError("");

    if (!selectedHall) {
      setError("Please select a hall / screen first.");
      return;
    }
    if (layout.length === 0) {
      setError("Please add at least one row.");
      return;
    }

    const seatNumbers = [];
    layout.forEach((r) => {
      for (let i = 1; i <= r.count; i++) {
        seatNumbers.push(`${r.row}${i}`);
      }
    });

    setGenerating(true);
    setGeneratedSeats([]);

    const created = [];
    let failed    = 0;

    for (let i = 0; i < seatNumbers.length; i++) {
      const seatNumber = seatNumbers[i];
      setProgress(`Creating seat ${i + 1} / ${seatNumbers.length}…`);

      try {
        const res  = await fetch(`${API_BASE}/seat`, {
          method:  "POST",
          headers: authHeaders(),
          body:    JSON.stringify({ hallId: selectedHall, seatNumber }),
        });
        const data = await res.json();

        if (data.success && data.seat) {
          const qrUrl = `${APP_BASE}/customer/welcome?seatId=${data.seat._id}&screen=${screenNo}&seat=${seatNumber}`;
          created.push({
            seatNumber,
            _id:      data.seat._id,
            qrValue:  qrUrl,
          });
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`Failed to create seat ${seatNumber}:`, err);
        failed++;
      }
    }

    setGeneratedSeats(created);
    setProgress("");
    setGenerating(false);

    if (failed > 0) {
      setError(`${failed} seat(s) could not be created. The rest were saved.`);
    }
  };

  // ── Clear ──
  const clearLayout = () => {
    setLayout([]);
    setGeneratedSeats([]);
    setScreenNo("");
    setRowName("");
    setSeatCount("");
    setSelectedHall(halls.length === 1 ? halls[0]._id : "");
    setError("");
    setProgress("");
  };

  // ─────────────────────────────────────────────────────────
  //  LOADING / ERROR STATES
  // ─────────────────────────────────────────────────────────
  if (theaterLoading) {
    return (
      <div className="qr-page">
        <h2>🎟 QR Generator</h2>
        <p style={{ color: "#888", textAlign: "center", padding: 40 }}>
          Loading theater…
        </p>
      </div>
    );
  }

  if (role !== "owner" && role !== "worker") {
    return <h3 style={{ padding: 20 }}>Access Denied</h3>;
  }

  if (!theaterData) {
    return (
      <div className="qr-page">
        <h2>🎟 QR Generator</h2>
        <p style={{ color: "#e55", textAlign: "center", padding: 40 }}>
          {error || "No theater found. Please go back and select a theater."}
        </p>
        <button
          onClick={() => navigate(-1)}
          style={{ display: "block", margin: "0 auto", padding: "8px 20px", cursor: "pointer" }}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="qr-page">
      <h2>🎟 QR Generator</h2>

      {/* Theater info banner */}
      <div style={{
        background: "#f9f9f9", border: "1px solid #eee", borderRadius: 8,
        padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#555",
      }}>
        🎬 <strong>{theaterData.name}</strong>
        {theaterData.branchName && ` — ${theaterData.branchName}`}
        {theaterData.city       && ` · ${theaterData.city}`}
      </div>

      <div className="qr-controls">

        {/* Hall selector */}
        <div>
          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>
            Select Hall / Screen *
          </label>
          {hallLoading ? (
            <p style={{ fontSize: 13, color: "#888" }}>Loading halls…</p>
          ) : halls.length === 0 ? (
            <p style={{ fontSize: 13, color: "#e55" }}>
              No halls found. Please create a hall for this theater first.
            </p>
          ) : (
            <select
              value={selectedHall}
              onChange={(e) => {
                setSelectedHall(e.target.value);
                const hall = halls.find((h) => h._id === e.target.value);
                setScreenNo(hall?.hallNumber || "");
              }}
            >
              <option value="">Select Hall</option>
              {halls.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} (Screen {h.hallNumber}) — {h.totalSeats} seats
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Row builder */}
        <div className="row-builder">
          <input
            placeholder="Row letter (A, B, C)"
            value={rowName}
            onChange={(e) => setRowName(e.target.value)}
            maxLength={3}
          />
          <input
            type="number"
            placeholder="No. of seats"
            value={seatCount}
            onChange={(e) => setSeatCount(e.target.value)}
            min="1"
            max="50"
          />
          <button className="add-row-btn" onClick={addRow}>
            Add Row
          </button>
        </div>

        {/* Layout preview */}
        {layout.length > 0 && (
          <div className="layout-preview">
            {layout.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ margin: 0 }}>
                  Row {r.row} → {r.count} seat(s)
                </p>
                <button
                  onClick={() => removeRow(i)}
                  style={{
                    background: "none", border: "none",
                    color: "#e55", cursor: "pointer", fontSize: 14,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "#aaa", margin: "4px 0 0" }}>
              Total: {layout.reduce((s, r) => s + r.count, 0)} seats
            </p>
          </div>
        )}

        {error    && <p style={{ color: "#e55", fontSize: 13, margin: "4px 0" }}>{error}</p>}
        {progress && <p style={{ color: "#888", fontSize: 13, margin: "4px 0" }}>{progress}</p>}

        {/* Action buttons */}
        <div className="qr-action-buttons">
          <button
            className="generate-btn"
            onClick={generateSeats}
            disabled={generating || halls.length === 0}
            style={{ opacity: generating ? 0.6 : 1 }}
          >
            {generating ? "Generating…" : "Generate & Save Seats"}
          </button>
          <button className="clear-btn" onClick={clearLayout} disabled={generating}>
            Clear
          </button>
        </div>

        {generatedSeats.length > 0 && (
          <button className="print-btn" onClick={() => window.print()}>
            🖨 Print QR Sheet ({generatedSeats.length} seats)
          </button>
        )}
      </div>

      {/* QR grid */}
      {generatedSeats.length > 0 && (
        <div className="qr-grid print-area">
          {generatedSeats.map((seat) => (
            <div key={seat._id} className="qr-card">
              <QRCodeCanvas value={seat.qrValue} size={120} />
              <h4>Seat {seat.seatNumber}</h4>
              <p>Screen {screenNo}</p>
              <p style={{ fontSize: 11 }}>
                {theaterData.branchName || theaterData.name}
              </p>
              <p style={{ fontSize: 9, color: "#aaa", wordBreak: "break-all" }}>
                ID: {seat._id}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QRGenerator;