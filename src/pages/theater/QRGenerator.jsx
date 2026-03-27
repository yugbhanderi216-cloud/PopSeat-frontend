import React, { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QRGenerator.css";
// ─────────────────────────────────────────────────────────────
// APIs USED:
//   GET  /api/cinema/:theaterId       — load one specific theater
//   GET  /api/halls?cinemaId=         — load halls for a cinema
//   POST /api/halls                   — create a hall manually
//   POST /api/halls/row               — create row with seats + QR codes (stored on backend)
//   GET  /api/halls/:hallId/seats     — load existing QR codes from backend
// ─────────────────────────────────────────────────────────────
const API_BASE = "https://popseat.onrender.com/api";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("ownerToken") ||
    localStorage.getItem("token") ||
    ""
    }`,
});
const QRGenerator = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const ownerEmail =
    localStorage.getItem("ownerEmail") || localStorage.getItem("email") || "";
  const role = (
    localStorage.getItem("ownerRole") ||
    localStorage.getItem("role") ||
    ""
  ).toLowerCase();
  const theaterId =
    state?.theaterId ||
    localStorage.getItem("activeOwnerTheaterId") ||
    localStorage.getItem("assignedTheaterId") ||
    localStorage.getItem("customerTheaterId") ||
    "";
  const [theaterData, setTheaterData] = useState(null);
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");
  const [screenNo, setScreenNo] = useState("");
  const [generatedSeats, setGeneratedSeats] = useState([]);
  const [rowName, setRowName] = useState("");
  const [seatCount, setSeatCount] = useState("");
  const [layout, setLayout] = useState([]);
  const [theaterLoading, setTheaterLoading] = useState(true);
  const [hallLoading, setHallLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  // Create Hall inline form
  const [newHallName, setNewHallName] = useState("");
  const [creatingHall, setCreatingHall] = useState(false);
  const [hallError, setHallError] = useState("");
  // ── Auth guard ──────────────────────────────────────────────
  useEffect(() => {
    if (!ownerEmail || (role !== "owner" && role !== "worker")) {
      navigate("/login", { replace: true });
    }
  }, [ownerEmail, role, navigate]);
  // ─────────────────────────────────────────────────────────
  //  LOAD THEATER
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
        const res = await fetch(`${API_BASE}/cinema/${theaterId}`, {
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
  //  LOAD HALLS  — GET /api/halls?cinemaId=
  // ─────────────────────────────────────────────────────────
  const loadHalls = useCallback(async (cinemaId) => {
    setHallLoading(true);
    try {
      const res = await fetch(`${API_BASE}/halls?cinemaId=${cinemaId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const allHalls = data.halls || [];
        setHalls(allHalls);
        // Auto-select if only one hall
        if (allHalls.length === 1) {
          setSelectedHall(allHalls[0]._id);
          setScreenNo(allHalls[0].screenNumber || allHalls[0].hallNumber || "1");
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
  //  CREATE HALL  — POST /api/halls
  // ─────────────────────────────────────────────────────────
  const createHall = async () => {
    setHallError("");
    if (!newHallName.trim()) {
      setHallError("Hall name is required.");
      return;
    }
    if (!theaterData?._id) {
      setHallError("Theater not loaded.");
      return;
    }
    setCreatingHall(true);
    try {
      const res = await fetch(`${API_BASE}/halls`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          cinemaId: theaterData._id,
          name: newHallName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewHallName("");
        await loadHalls(theaterData._id);
      } else {
        setHallError(data.message || "Failed to create hall.");
      }
    } catch (err) {
      console.error("Create hall error:", err);
      setHallError("Network error. Could not create hall.");
    } finally {
      setCreatingHall(false);
    }
  };
  // ─────────────────────────────────────────────────────────
  //  LOAD EXISTING SEATS  — GET /api/halls/:hallId/seats
  // ─────────────────────────────────────────────────────────
  const loadSeatsForHall = useCallback(async (hallId) => {
    if (!hallId) {
      setGeneratedSeats([]);
      return;
    }
    setProgress("Loading existing seats...");
    try {
      const res = await fetch(`${API_BASE}/halls/${hallId}/seats`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && data.seats) {
        const loaded = data.seats.map((seat) => ({
          seatNumber: seat.seatNumber,
          _id: seat.seatNumber,       // stable key for React
          qrCode: seat.qrCode,        // base64 PNG from backend
          qrData: seat.qrData,        // URL string (fallback for QRCodeCanvas)
        }));
        setGeneratedSeats(loaded);
      } else {
        setGeneratedSeats([]);
      }
    } catch (err) {
      console.error("Failed to load existing seats:", err);
      setGeneratedSeats([]);
    } finally {
      setProgress("");
    }
  }, []);
  useEffect(() => {
    loadSeatsForHall(selectedHall);
  }, [selectedHall, loadSeatsForHall]);
  // ─────────────────────────────────────────────────────────
  //  ROW BUILDER (local state only — no API call)
  // ─────────────────────────────────────────────────────────
  const addRowToLayout = () => {
    if (!rowName.trim() || !seatCount) {
      setError("Enter both a row name and seat count.");
      return;
    }
    if (Number(seatCount) < 1 || Number(seatCount) > 50) {
      setError("Seat count must be between 1 and 50.");
      return;
    }
    const upperRow = rowName.trim().toUpperCase();
    if (layout.some((r) => r.row === upperRow)) {
      setError(`Row ${upperRow} already added.`);
      return;
    }
    setLayout([...layout, { row: upperRow, count: Number(seatCount) }]);
    setRowName("");
    setSeatCount("");
    setError("");
  };
  const removeRow = (i) => setLayout(layout.filter((_, idx) => idx !== i));
  // ─────────────────────────────────────────────────────────
  //  GENERATE & SAVE SEATS  — POST /api/halls/row (per row)
  //  Backend generates QR codes and stores them in Hall document
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
    setGenerating(true);
    let failed = 0;
    try {
      for (let i = 0; i < layout.length; i++) {
        const row = layout[i];
        setProgress(`Saving row ${row.row} to backend (${i + 1}/${layout.length})…`);
        try {
          const payload = {
            hallId: selectedHall,
            rowLabel: row.row,
            numberOfSeats: row.count,
            baseUrl: `${window.location.origin}/customer/menu`,
          };
          const res = await fetch(`${API_BASE}/halls/row`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            console.error(`Row ${row.row} failed:`, data.message);
            failed++;
          }
        } catch (err) {
          console.error(`Row ${row.row} network error:`, err);
          failed++;
        }
      }
      if (failed > 0) {
        setError(`${failed} row(s) failed. Others were saved.`);
      }
      // ✅ Await the seat reload so QR codes from backend render correctly
      await loadSeatsForHall(selectedHall);
      setLayout([]); // clear after successful generation
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };
  // ── Clear ───────────────────────────────────────────────────
  const clearLayout = () => {
    setLayout([]);
    setGeneratedSeats([]);
    setSelectedHall("");
    setScreenNo("");
    setRowName("");
    setSeatCount("");
    setError("");
    setProgress("");
  };
  // ── Loading / guard screens ─────────────────────────────────
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
  return (
    <div className="qr-page">
      <h2>🎟 QR Generator</h2>
      {/* Theater Info Banner */}
      <div
        style={{
          background: "#f9f9f9", border: "1px solid #eee", borderRadius: 8,
          padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#555",
        }}
      >
        🎬 <strong>{theaterData.name}</strong>
        {theaterData.branchName && ` — ${theaterData.branchName}`}
        {theaterData.city && ` · ${theaterData.city}`}
      </div>
      <div className="qr-controls">
        {/* ── Hall selector ── */}
        <div>
          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>
            Select Hall / Screen *
          </label>
          {hallLoading ? (
            <p style={{ fontSize: 13, color: "#888" }}>Loading halls…</p>
          ) : halls.length === 0 ? (
            // No halls: show inline create form (happens for old cinemas without auto-created halls)
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 13, color: "#e55", marginBottom: 8 }}>
                No halls found. Create one below:
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  placeholder="Hall name (e.g. Audi 1)"
                  value={newHallName}
                  onChange={(e) => setNewHallName(e.target.value)}
                  style={{ flex: 1, minWidth: 150, padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}
                />
                <button
                  onClick={createHall}
                  disabled={creatingHall}
                  style={{
                    padding: "6px 16px", borderRadius: 6, border: "none",
                    background: "#6C63FF", color: "#fff", cursor: "pointer",
                    opacity: creatingHall ? 0.6 : 1,
                  }}
                >
                  {creatingHall ? "Creating…" : "+ Create Hall"}
                </button>
              </div>
              {hallError && (
                <p style={{ color: "#e55", fontSize: 12, marginTop: 4 }}>{hallError}</p>
              )}
            </div>
          ) : (
            // Has halls: show dropdown
            <select
              value={selectedHall}
              onChange={(e) => {
                setSelectedHall(e.target.value);
                const hall = halls.find((h) => h._id === e.target.value);
                setScreenNo(hall?.screenNumber || hall?.hallNumber || "");
              }}
            >
              <option value="">— Select Hall —</option>
              {halls.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} — {h.totalSeats} seats
                </option>
              ))}
            </select>
          )}
        </div>
        {/* ── Row builder ── */}
        <div className="row-builder">
          <input
            placeholder="Row letter (A, B, C)"
            value={rowName}
            onChange={(e) => setRowName(e.target.value)}
            maxLength={3}
            disabled={!selectedHall}
          />
          <input
            type="number"
            placeholder="No. of seats"
            value={seatCount}
            onChange={(e) => setSeatCount(e.target.value)}
            min="1"
            max="50"
            disabled={!selectedHall}
          />
          <button
            className="add-row-btn"
            onClick={addRowToLayout}
            disabled={!selectedHall}
          >
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
                  style={{ background: "none", border: "none", color: "#e55", cursor: "pointer", fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "#aaa", margin: "4px 0 0" }}>
              Total: {layout.reduce((s, r) => s + r.count, 0)} new seats to save
            </p>
          </div>
        )}
        {error && <p style={{ color: "#e55", fontSize: 13, margin: "4px 0" }}>{error}</p>}
        {progress && <p style={{ color: "#888", fontSize: 13, margin: "4px 0" }}>{progress}</p>}
        {/* Action buttons */}
        <div className="qr-action-buttons">
          <button
            className="generate-btn"
            onClick={generateSeats}
            disabled={generating || !selectedHall || layout.length === 0}
            style={{ opacity: generating || layout.length === 0 ? 0.6 : 1 }}
          >
            {generating ? "Generating…" : "Generate & Save Seats"}
          </button>
          <button className="clear-btn" onClick={clearLayout} disabled={generating}>
            Clear
          </button>
        </div>
        {generatedSeats.length > 0 && (
          <button
            className="print-btn"
            onClick={() => window.print()}
            style={{ marginTop: 10 }}
          >
            🖨 Print Sheet ({generatedSeats.length} QR codes)
          </button>
        )}
      </div>
      {/* QR Grid */}
      {generatedSeats.length > 0 && (
        <div className="qr-grid print-area">
          {generatedSeats.map((seat) => (
            <div key={seat._id} className="qr-card">
              {/* Show backend-stored base64 QR; fallback to client-side if missing */}
              {seat.qrCode ? (
                <img
                  src={seat.qrCode}
                  alt={`QR for seat ${seat.seatNumber}`}
                  width={120}
                  height={120}
                />
              ) : seat.qrData ? (
                <QRCodeCanvas value={seat.qrData} size={120} />
              ) : null}
              <h4>Seat {seat.seatNumber}</h4>
              {screenNo && <p>Screen {screenNo}</p>}
              <p style={{ fontSize: 11 }}>
                {theaterData.branchName || theaterData.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default QRGenerator;