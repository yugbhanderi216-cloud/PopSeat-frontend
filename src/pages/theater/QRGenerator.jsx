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
  //  LOAD THEATER  — GET /api/cinema/:theaterId
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
  //  LOAD HALLS  — GET /api/hall?cinemaId=
  //  Updated hall shape: { _id, name, screenNumber, hallNumber, rows, totalSeats }
  //  screenNumber is now a number field (was only hallNumber before)
  // ─────────────────────────────────────────────────────────
  const loadHalls = useCallback(async (cinemaId) => {
    setHallLoading(true);
    try {
      const res = await fetch(`${API_BASE}/hall?cinemaId=${cinemaId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const allHalls = data.halls || [];
        setHalls(allHalls);
        // Auto-select if only one hall
        if (allHalls.length === 1) {
          setSelectedHall(allHalls[0]._id);
          // Use screenNumber (new field) first, fallback to hallNumber
          setScreenNo(
            String(allHalls[0].screenNumber || allHalls[0].hallNumber || "1")
          );
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
    loadSeatsForHall(selectedHall);
  }, [selectedHall, loadSeatsForHall]);

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
  //  GENERATE & SAVE SEATS  — POST /api/seat per seat
  //
  //  Confirmed API: POST /api/seat → { hallId, seatNumber }
  //  Returns: { success, seat: { _id, seatNumber, hallId, qrCode } }
  //
  //  NOTE: /api/halls/row is NOT confirmed in API docs.
  //        We create seats one-by-one using the confirmed endpoint.
  //        Backend auto-generates QR code per seat (confirmed in docs).
  //
  //  QR URL is generated by the backend embedded in seat.qrCode (base64 PNG)
  //  The backend should be configured to encode:
  //    https://pop-seat-frontend.vercel.app/#/customer/welcome?seatId=<id>&screen=<n>&seat=<seatNumber>&type=Standard
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

    // Auth check — surface missing token immediately
    const token = getToken();
    if (!token) {
      setError("❌ Not authenticated. Please log out and log in again.");
      return;
    }

    setGenerating(true);
    let failed = 0;
    let created = 0;
    let firstError = "";
    const total = layout.reduce((s, r) => s + r.count, 0);

    try {
      for (const row of layout) {
        for (let n = 1; n <= row.count; n++) {
          const seatNumber = `${row.row}${n}`;
          setProgress(`Creating seat ${seatNumber} (${created + 1}/${total})…`);
          try {
            const res = await fetch(`${API_BASE}/seat`, {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({
                hallId: selectedHall,
                seatNumber,
              }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              const msg = data.message || `HTTP ${res.status}`;
              console.error(`Seat ${seatNumber} failed:`, msg);
              if (!firstError) firstError = msg;
              failed++;
            } else {
              created++;
            }
          } catch (err) {
            console.error(`Seat ${seatNumber} network error:`, err);
            if (!firstError) firstError = "Network error — check connection.";
            failed++;
          }
        }
      }

      if (failed > 0 && created === 0) {
        // All failed — show the actual backend error message
        setError(`❌ All seats failed. Backend said: "${firstError}"`);
      } else if (failed > 0) {
        setError(`⚠️ ${failed} seat(s) failed ("${firstError}"). ${created} saved successfully.`);
      }

      if (created > 0) {
        // Reload seats so QR codes from backend render correctly
        await loadSeatsForHall(selectedHall);
        setLayout([]);
      }
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  // ── Clear ──────────────────────────────────────────────────
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
        <div>
          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>
            Select Hall / Screen *
          </label>
          {hallLoading ? (
            <p style={{ fontSize: 13, color: "#888" }}>Loading halls…</p>
          ) : halls.length === 0 ? (
            // No halls — show inline create form
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 13, color: "#e55", marginBottom: 8 }}>
                No halls found. Create one below:
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  placeholder="Hall name (e.g. Audi 1)"
                  value={newHallName}
                  onChange={(e) => setNewHallName(e.target.value)}
                  style={{
                    flex: 1, minWidth: 150, padding: "6px 10px",
                    borderRadius: 6, border: "1px solid #ccc",
                  }}
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
            // Has halls — show dropdown
            <select
              value={selectedHall}
              onChange={(e) => {
                setSelectedHall(e.target.value);
                const hall = halls.find((h) => h._id === e.target.value);
                // Use screenNumber (new field) first, fallback to hallNumber
                setScreenNo(
                  String(hall?.screenNumber || hall?.hallNumber || "")
                );
              }}
            >
              <option value="">— Select Hall —</option>
              {halls.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} — Screen {h.screenNumber || h.hallNumber}
                  {h.totalSeats > 0 ? ` · ${h.totalSeats} seats` : " · 0 seats"}
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
              {/* Show backend-stored base64 QR; fallback to client-side QRCodeCanvas */}
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