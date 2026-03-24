import React, { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QRGenerator.css";

// ─────────────────────────────────────────────────────────────
// APIs USED:
//   GET  /api/cinema          ✅ — load owner's theater
//   GET  /api/hall            ✅ — load halls for theaterId
//   POST /api/seat            ✅ — create seat, returns qrCode + _id
//   GET  /api/seat            ✅ — list existing seats (dedup check)
//
// QR URL now points to production CustomerWelcome route:
//   /customer/welcome?seatId=<_id from POST /api/seat>
//   CustomerWelcome calls GET /api/seat/:id to load theater info
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://popseat.onrender.com/api";

// Production base URL for QR codes — update if your domain changes
const APP_BASE  = window.location.origin; // e.g. https://popseat.vercel.app

const authHeaders = () => ({
  "Content-Type" : "application/json",
  Authorization  : `Bearer ${
    localStorage.getItem("ownerToken") || localStorage.getItem("token") || ""
  }`,
});

const QRGenerator = () => {

  const { state } = useLocation();
  const navigate  = useNavigate();

  // FIX: was "OWNER"/"BRANCH" — API returns "owner"/"worker" (lowercase)
  const ownerEmail = localStorage.getItem("ownerEmail") || localStorage.getItem("email") || "";
  const role       = (localStorage.getItem("ownerRole") || localStorage.getItem("role") || "").toLowerCase();

  const [theaterData, setTheaterData] = useState(null);
  const [halls,       setHalls]       = useState([]);       // from GET /api/hall
  const [selectedHall,setSelectedHall]= useState("");       // hallId for POST /api/seat
  const [screenNo,    setScreenNo]    = useState("");
  const [generatedSeats, setGeneratedSeats] = useState([]); // { seatNumber, _id, qrCode }

  const [rowName,    setRowName]    = useState("");
  const [seatCount,  setSeatCount]  = useState("");
  const [layout,     setLayout]     = useState([]);

  const [theaterLoading, setTheaterLoading] = useState(true);
  const [hallLoading,    setHallLoading]    = useState(false);
  const [generating,     setGenerating]     = useState(false);
  const [error,          setError]          = useState("");
  const [progress,       setProgress]       = useState(""); // "Creating seat 3/12..."

  /* ── Auth guard ── */

  useEffect(() => {
    if (!ownerEmail || (role !== "owner" && role !== "worker")) {
      navigate("/login", { replace: true });
    }
  }, [ownerEmail, role, navigate]);

  /* ===============================
     LOAD THEATER — GET /api/cinema
     FIX: was reading from localStorage.getItem("theaters")
          which is a local array never synced with server
  =============================== */

  useEffect(() => {

    const fetchTheater = async () => {

      setTheaterLoading(true);
      setError("");

      // theaterId can come from navigation state or localStorage
      const theaterId =
        state?.theaterId                              ||
        localStorage.getItem("activeOwnerTheaterId") ||
        localStorage.getItem("customerTheaterId")    || "";

      try {

        const res  = await fetch(`${API_BASE}/cinema`, {
          headers: authHeaders(),
        });
        const data = await res.json();

        if (data.success) {

          let theater = null;

          if (theaterId) {
            // Prefer exact ID match if we have one
            theater = data.cinemas.find((c) => c._id === theaterId);
          }

          if (!theater) {
            // Fall back to owner email match
            theater = data.cinemas.find(
              (c) =>
                c.email?.toLowerCase()      === ownerEmail.toLowerCase() ||
                c.ownerEmail?.toLowerCase() === ownerEmail.toLowerCase()
            );
          }

          if (theater) {
            setTheaterData(theater);
          } else {
            setError("No theater found for your account.");
          }

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

  }, [ownerEmail, state]);

  /* ===============================
     LOAD HALLS — GET /api/hall
     Called after theater is loaded.
     hallId is required for POST /api/seat.
  =============================== */

  const loadHalls = useCallback(async (cinemaId) => {

    setHallLoading(true);

    try {

      const res  = await fetch(`${API_BASE}/hall?cinemaId=${cinemaId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();

      if (data.success) {
        // Filter halls belonging to this cinema
        const cinemaHalls = (data.halls || []).filter(
          (h) =>
            h.cinemaId === cinemaId ||
            h.cinemaId?._id === cinemaId
        );
        setHalls(cinemaHalls);
        if (cinemaHalls.length === 1) {
          // Auto-select if only one hall
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
    if (theaterData?._id) {
      loadHalls(theaterData._id);
    }
  }, [theaterData, loadHalls]);

  /* ── Row builder ── */

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

  /* ===============================
     GENERATE SEATS — POST /api/seat ✅
     FIX: was generating QR codes client-side with localhost URL.
          Now creates each seat on server via POST /api/seat,
          which returns the real _id and a server-generated qrCode.
          The QR URL uses the real seat _id so CustomerWelcome
          can call GET /api/seat/:id successfully.
  =============================== */

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

    // Build flat seat number list from layout
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
      setProgress(`Creating seat ${i + 1} / ${seatNumbers.length}...`);

      try {

        const res  = await fetch(`${API_BASE}/seat`, {
          method  : "POST",
          headers : authHeaders(),
          body    : JSON.stringify({
            hallId    : selectedHall,
            seatNumber,
          }),
        });

        const data = await res.json();

        if (data.success && data.seat) {

          // FIX: QR URL uses production origin + real seat _id
          // CustomerWelcome reads seatId param → GET /api/seat/:id
          const qrUrl = `${APP_BASE}/customer/welcome?seatId=${data.seat._id}&screen=${screenNo}&seat=${seatNumber}`;

          created.push({
            seatNumber,
            _id    : data.seat._id,
            // Use server-generated QR if available, else build our own URL
            qrUrl  : data.seat.qrCode || qrUrl,
            qrValue: qrUrl,   // always use our structured URL for QRCodeCanvas
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

  /* ── Clear ── */

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

  /* ── Loading ── */

  if (theaterLoading) {
    return (
      <div className="qr-page">
        <h2>🎟 QR Generator</h2>
        <p style={{ color: "#888", textAlign: "center", padding: 40 }}>
          Loading theater...
        </p>
      </div>
    );
  }

  /* ── Auth / no theater ── */

  if (role !== "owner" && role !== "worker") {
    return <h3 style={{ padding: 20 }}>Access Denied</h3>;
  }

  if (!theaterData) {
    return (
      <div className="qr-page">
        <h2>🎟 QR Generator</h2>
        <p style={{ color: "#e55", textAlign: "center", padding: 40 }}>
          {error || "No theater found. Please register a theater first."}
        </p>
      </div>
    );
  }

  /* ── Render ── */

  return (

    <div className="qr-page">

      <h2>🎟 QR Generator</h2>

      {/* THEATER INFO */}
      <div style={{
        background: "#f9f9f9", border: "1px solid #eee", borderRadius: 8,
        padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#555",
      }}>
        {/* FIX: was theaterData.branch — API field is branchName */}
        🎬 <strong>{theaterData.name}</strong>
        {theaterData.branchName && ` — ${theaterData.branchName}`}
        {theaterData.city && ` · ${theaterData.city}`}
      </div>

      <div className="qr-controls">

        {/* HALL / SCREEN SELECT
            FIX: was a simple screenNo dropdown using totalScreens count
                 Now selects real halls from GET /api/hall
                 hallId is required by POST /api/seat */}
        <div>
          <label style={{ fontSize: 13, color: "#555", display: "block", marginBottom: 4 }}>
            Select Hall / Screen *
          </label>
          {hallLoading ? (
            <p style={{ fontSize: 13, color: "#888" }}>Loading halls...</p>
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

        {/* ROW BUILDER */}
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

        {/* LAYOUT PREVIEW with remove */}
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

        {/* ERROR */}
        {error && (
          <p style={{ color: "#e55", fontSize: 13, margin: "4px 0" }}>{error}</p>
        )}

        {/* PROGRESS */}
        {progress && (
          <p style={{ color: "#888", fontSize: 13, margin: "4px 0" }}>{progress}</p>
        )}

        {/* ACTION BUTTONS */}
        <div className="qr-action-buttons">
          <button
            className="generate-btn"
            onClick={generateSeats}
            disabled={generating || halls.length === 0}
            style={{ opacity: generating ? 0.6 : 1 }}
          >
            {generating ? "Generating..." : "Generate & Save Seats"}
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

      {/* QR GRID
          FIX: was using localhost:5173 URL
               Now shows real seat _id in QR value
               CustomerWelcome → GET /api/seat/:id works correctly */}
      {generatedSeats.length > 0 && (
        <div className="qr-grid print-area">
          {generatedSeats.map((seat) => (
            <div key={seat._id} className="qr-card">

              <QRCodeCanvas
                value={seat.qrValue}
                size={120}
              />

              <h4>Seat {seat.seatNumber}</h4>
              {/* FIX: was theaterData.branch → branchName */}
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