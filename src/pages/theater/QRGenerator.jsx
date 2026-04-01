import React, { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QRGenerator.css";

// ─────────────────────────────────────────────────────────────
// APIs USED:
//   GET  /api/cinema/:theaterId       ✅ — load one specific theater
//   GET  /api/hall?cinemaId=          ✅ — load halls for a cinema
//   POST /api/hall                    ✅ — create a hall manually
//   POST /api/halls/row               ✅ — create row with seats + QR codes
//   GET  /api/halls/:hallId/seats     ✅ — load existing QR codes from backend
//
// QR URL FORMAT (scanned by customer):
//   https://pop-seat-frontend.vercel.app/#/customer/welcome
//     ?seatId=<seat._id>
//     &screen=<screenNumber>
//     &seat=<seatNumber>        e.g. A1
//     &type=Standard
//
// CustomerWelcome reads: seatId, screen, seat, type from URL params
// Then calls GET /api/seat/:seatId to get cinema info
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://popseat.onrender.com/api";

// Login.jsx stores token as "token" — check all known keys for safety
const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("ownerToken") ||
  localStorage.getItem("workerToken") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
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
    "";

  const [theaterData, setTheaterData] = useState(null);
  const [halls, setHalls] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState("");
  const [hallId, setHallId] = useState("");
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
  //  LOAD THEATER — GET /api/cinema/:theaterId
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
          // Auto-initialize halls based on screen count if no halls exist
          // or at least fetch existing ones.
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
  //  HALL MAPPING LOGIC
  //  1. Fetch halls using cinemaId
  //  2. Find hall where hall.hallNumber === String(screenNumber)
  //  3. If not found -> Create hall using POST /api/hall
  // ─────────────────────────────────────────────────────────
  const mapScreenToHall = useCallback(async (screenNumber) => {
    if (!screenNumber || !theaterData?._id) return;
    
    setHallLoading(true);
    setHallId("");
    setError("");

    try {
      // 1. Fetch
      const res = await fetch(`${API_BASE}/hall?cinemaId=${theaterData._id}`, {
        headers: authHeaders(),
      });
      const data = await res.json();

      if (data.success) {
        setHalls(data.halls || []);
        
        // 2. Find (hallNumber must be string when comparing)
        const matched = (data.halls || []).find(
          (h) => String(h.hallNumber) === String(screenNumber)
        );

        if (matched) {
          setHallId(matched._id);
          loadSeatsForHall(matched._id);
        } else {
          // 3. Create if not found
          setProgress(`Creating Screen ${screenNumber}...`);
          const createRes = await fetch(`${API_BASE}/hall`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              cinemaId: theaterData._id,
              name: `Screen ${screenNumber}`,
              hallNumber: String(screenNumber),
            }),
          });
          const createData = await createRes.json();
          if (createData.success && createData.hall) {
            setHallId(createData.hall._id);
            loadSeatsForHall(createData.hall._id);
          } else {
            setError(createData.message || "Failed to initialize screen/hall.");
          }
        }
      }
    } catch (err) {
      console.error("Hall mapping error:", err);
      setError("Failed to link screen to hall database.");
    } finally {
      setHallLoading(false);
      setProgress("");
    }
  }, [theaterData, loadSeatsForHall]);

  useEffect(() => {
    if (selectedScreen) mapScreenToHall(selectedScreen);
  }, [selectedScreen, mapScreenToHall]);

  // ─────────────────────────────────────────────────────────
  //  CREATE HALL  — POST /api/hall
  //  API body: { cinemaId, name, hallNumber, totalSeats }
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
      const res = await fetch(`${API_BASE}/hall`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          cinemaId: theaterData._id,
          name: newHallName.trim(),
          hallNumber: String(halls.length + 1),
          totalSeats: 0,
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
  //  LOAD EXISTING SEATS  — GET /api/seat (filter by hallId client-side)
  //  NOTE: /api/halls/:hallId/seats is NOT in API docs.
  //        Confirmed endpoint: GET /api/seat → returns all seats with hallId populated
  // ─────────────────────────────────────────────────────────
  const loadSeatsForHall = useCallback(async (hallId) => {
    if (!hallId) {
      setGeneratedSeats([]);
      return;
    }

    setProgress("Loading existing seats...");

    try {
      // ✅ If your backend supports filtering → use this
      const res = await fetch(`${API_BASE}/seat?hallId=${hallId}`, {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (data.success && data.seats) {
        const seats = data.seats.map((seat) => ({
          seatNumber: seat.seatNumber,
          _id: seat._id,
          qrCode: seat.qrCode,
          qrData: seat.qrData,
        }));

        setGeneratedSeats(seats);
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
    // This effect is now handled by mapScreenToHall
  }, [hallId, loadSeatsForHall]);

  // ─────────────────────────────────────────────────────────
  // ROW BUILDER
  // ─────────────────────────────────────────────────────────
  const addRowToLayout = () => {
    setError("");

    if (!rowName.trim() || !seatCount) {
      setError("Enter both a row name and seat count.");
      return;
    }

    const count = Number(seatCount);

    if (isNaN(count) || count < 1 || count > 50) {
      setError("Seat count must be between 1 and 50.");
      return;
    }

    const upperRow = rowName.trim().toUpperCase();

    if (layout.some((r) => r.row === upperRow)) {
      setError(`Row ${upperRow} already added.`);
      return;
    }

    setLayout((prev) => [...prev, { row: upperRow, count }]);

    setRowName("");
    setSeatCount("");
  };

  const removeRow = (i) => {
    setLayout((prev) => prev.filter((_, idx) => idx !== i));
  };
  // ─────────────────────────────────────────────────────────
  //  GENERATE & SAVE SEATS (Old Way)
  //  For each seat: POST /api/seat { hallId, seatNumber }
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

    const token = getToken();
    if (!token) {
      setError("❌ Not authenticated. Please log in again.");
      return;
    }

    setGenerating(true);
    setProgress("Saving layout to backend...");

    try {
      // Endpoint from api.txt: /api/owner/theaters/:theaterId/screens/:screenId/layout
      const res = await fetch(`${API_BASE}/owner/theaters/${theaterId}/screens/${selectedHall}/layout`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ layout }),
      });

      const data = await res.json();

      if (data.success) {
        // Success — now fetch generated seats to show QRs
        await loadSeatsForHall(selectedHall);
        setLayout([]);
        setError("");
      } else {
        // Fallback or handle error
        setError(`❌ Failed to save: ${data.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Bulk save error:", err);
      setError("Network error — could not save layout.");
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  // ── Clear ──────────────────────────────────────────────────
  const clearLayout = () => {
    setLayout([]);
    setGeneratedSeats([]);
    setSelectedScreen("");
    setHallId("");
    setRowName("");
    setSeatCount("");
    setError("");
    setProgress("");
  };

  // ── Loading / guard screens ────────────────────────────────
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
          style={{
            display: "block", margin: "0 auto",
            padding: "8px 20px", cursor: "pointer",
          }}
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
      <div style={{
        background: "#f9f9f9", border: "1px solid #eee", borderRadius: 8,
        padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#555",
      }}>
        🎬 <strong>{theaterData.name}</strong>
        {theaterData.branchName && ` — ${theaterData.branchName}`}
        {theaterData.city && ` · ${theaterData.city}`}
      </div>

      <div className="qr-controls">

        {/* ── Hall selector ── */}
        {/* ── Screen selector (numeric dropdown) ── */}
        <div>
          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>
            Select Screen Number *
          </label>
          <select
            value={selectedScreen}
            onChange={(e) => setSelectedScreen(e.target.value)}
            disabled={hallLoading || generating}
          >
            <option value="">— Select Screen —</option>
            {Array.from({ length: Number(theaterData.totalScreens || 1) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>
                Screen {n}
              </option>
            ))}
          </select>
          {hallLoading && (
            <p style={{ fontSize: 12, color: "#6C63FF", marginTop: 4 }}>
              Linking/Initializing hall...
            </p>
          )}
        </div>

        {/* ── Row builder ── */}
        <div className="row-builder">
          <input
            placeholder="Row letter (A, B, C)"
            value={rowName}
            onChange={(e) => setRowName(e.target.value)}
            maxLength={3}
            disabled={!hallId || generating}
          />
          <input
            type="number"
            placeholder="No. of seats"
            value={seatCount}
            onChange={(e) => setSeatCount(e.target.value)}
            min="1"
            max="50"
            disabled={!hallId || generating}
          />
          <button
            className="add-row-btn"
            onClick={addRowToLayout}
            disabled={!hallId || generating}
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
            disabled={generating || !hallId || layout.length === 0}
            style={{ opacity: generating || layout.length === 0 ? 0.6 : 1 }}
          >
            {generating ? "Generating..." : "Generate & Save Seats"}
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
              <QRCodeCanvas 
                value={`https://popseat-frontend.vercel.app/#/customer/welcome?seatId=${seat._id}&hallId=${hallId}&screen=${selectedScreen}&seat=${seat.seatNumber}`}
                size={120} 
              />
              <h4>Seat {seat.seatNumber}</h4>
              <p>Screen {selectedScreen}</p>
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