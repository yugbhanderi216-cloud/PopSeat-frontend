import React, { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import "./QRGenerator.css";

// ─────────────────────────────────────────────────────────────
// APIs USED:
//   GET  /api/cinema/:theaterId       — load theater
//   GET  /api/hall?cinemaId=          — load halls for cinema
//   POST /api/hall                    — create hall if not exists
//   POST /api/seat                    — create individual seat
//   GET  /api/seat?hallId=            — load existing seats for hall
//
// QR URL FORMAT (scanned by customer):
//   https://popseat-frontend.vercel.app/#/customer/welcome
//     ?seatId=<seat._id>
//     &hallId=<hallId>
//     &screen=<screenNumber>
//     &seat=<seatNumber>  (e.g. A1)
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://popseat.onrender.com/api";
const CUSTOMER_BASE = "https://pop-seat-frontend.vercel.app/customer/welcome";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("ownerToken") ||
  localStorage.getItem("workerToken") ||
  "";

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

  // ── State ─────────────────────────────────────────────────
  const [theaterData, setTheaterData] = useState(null);
  const [halls, setHalls] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState("");
  const [hallId, setHallId] = useState("");

  const [generatedSeats, setGeneratedSeats] = useState([]); // saved seats with _id
  const [layout, setLayout] = useState([]); // pending rows [{row, count}]
  const [rowName, setRowName] = useState("");
  const [seatCount, setSeatCount] = useState("");

  const [theaterLoading, setTheaterLoading] = useState(true);
  const [hallLoading, setHallLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [progressCount, setProgressCount] = useState({ done: 0, total: 0 });

  const qrRefs = useRef({});

  // ── Auth guard ────────────────────────────────────────────
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
        } else if (res.status === 404) {
          setError("Theater not found.");
        } else {
          setError(data.message || "Failed to load theater.");
        }
      } catch {
        setError("Network error. Could not load theater.");
      } finally {
        setTheaterLoading(false);
      }
    };
    if (ownerEmail) fetchTheater();
  }, [theaterId, ownerEmail]);

  // ─────────────────────────────────────────────────────────
  //  LOAD SEATS FOR HALL — GET /api/seat?hallId=
  // ─────────────────────────────────────────────────────────
  const loadSeatsForHall = useCallback(async (hId) => {
    if (!hId) {
      setGeneratedSeats([]);
      return;
    }
    setProgress("Loading existing seats…");
    try {
      const res = await fetch(`${API_BASE}/seat?hallId=${hId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && data.seats) {
        setGeneratedSeats(
          data.seats
            .map((s) => ({
              _id: s._id,
              seatNumber: s.seatNumber,
              hallId: hId,
            }))
            .sort((a, b) =>
              a.seatNumber.localeCompare(b.seatNumber, undefined, {
                numeric: true,
                sensitivity: "base",
              })
            )
        );
      } else {
        setGeneratedSeats([]);
      }
    } catch {
      setGeneratedSeats([]);
    } finally {
      setProgress("");
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  //  HALL MAPPING — find or create hall for screen number
  //  GET /api/hall?cinemaId= → match hallNumber === screenNumber
  //  If not found → POST /api/hall
  // ─────────────────────────────────────────────────────────
  const mapScreenToHall = useCallback(
    async (screenNumber) => {
      if (!screenNumber || !theaterData?._id) return;
      setHallLoading(true);
      setHallId("");
      setGeneratedSeats([]);
      setError("");

      try {
        // 1. Fetch all halls for cinema
        const res = await fetch(
          `${API_BASE}/hall?cinemaId=${theaterData._id}`,
          { headers: authHeaders() }
        );
        const data = await res.json();

        if (!data.success) {
          setError("Failed to fetch halls.");
          return;
        }

        setHalls(data.halls || []);

        // 2. Find by hallNumber (compare as strings)
        const matched = (data.halls || []).find(
          (h) => String(h.hallNumber) === String(screenNumber)
        );

        if (matched) {
          setHallId(matched._id);
          await loadSeatsForHall(matched._id);
        } else {
          // 3. Create hall automatically
          setProgress(`Initializing Screen ${screenNumber}…`);
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
            await loadSeatsForHall(createData.hall._id);
          } else {
            setError(createData.message || "Failed to create hall.");
          }
        }
      } catch {
        setError("Failed to link screen to hall.");
      } finally {
        setHallLoading(false);
        setProgress("");
      }
    },
    [theaterData, loadSeatsForHall]
  );

  useEffect(() => {
    if (selectedScreen) mapScreenToHall(selectedScreen);
  }, [selectedScreen, mapScreenToHall]);

  // ─────────────────────────────────────────────────────────
  //  ROW BUILDER
  // ─────────────────────────────────────────────────────────
  const addRowToLayout = () => {
    setError("");
    if (!rowName.trim() || !seatCount) {
      setError("Enter both a row letter and seat count.");
      return;
    }
    const count = Number(seatCount);
    if (isNaN(count) || count < 1 || count > 50) {
      setError("Seat count must be between 1 and 50.");
      return;
    }
    const upper = rowName.trim().toUpperCase();
    if (layout.some((r) => r.row === upper)) {
      setError(`Row ${upper} is already added.`);
      return;
    }
    setLayout((prev) => [...prev, { row: upper, count }]);
    setRowName("");
    setSeatCount("");
  };

  const removeRow = (i) =>
    setLayout((prev) => prev.filter((_, idx) => idx !== i));

  // ─────────────────────────────────────────────────────────
  //  GENERATE & SAVE SEATS
  //  For every seat in layout: POST /api/seat { hallId, seatNumber }
  //  Uses Promise.all for parallel calls.
  //  Skips duplicates (!res.ok) gracefully.
  // ─────────────────────────────────────────────────────────
  const generateSeats = async () => {
    setError("");

    if (!hallId) {
      setError("Please select a screen first.");
      return;
    }
    if (layout.length === 0) {
      setError("Please add at least one row.");
      return;
    }

    // Build full seat list from layout
    const seatList = [];
    for (const { row, count } of layout) {
      for (let i = 1; i <= count; i++) {
        seatList.push(`${row}${i}`);
      }
    }

    setGenerating(true);
    setProgressCount({ done: 0, total: seatList.length });
    setProgress(`Saving ${seatList.length} seats…`);

    // ── saveSeat ──────────────────────────────────────────
    // POST /api/seat → { success: true, seat: { _id, seatNumber, hallId } }
    // Returns null for duplicates (!res.ok) or unexpected shapes.
    const saveSeat = async (seatNumber) => {
      try {
        const res = await fetch(`${API_BASE}/seat`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ hallId, seatNumber }),
        });

        setProgressCount((prev) => ({ ...prev, done: prev.done + 1 }));

        if (!res.ok) {
          return null; // skip duplicate or any error
        }

        const data = await res.json();

        if (data.success && data.seat) {
          return { _id: data.seat._id, seatNumber: data.seat.seatNumber, hallId };
        }

        return null;
      } catch {
        return null;
      }
    };

    const results = await Promise.all(seatList.map(saveSeat));
    const saved = results.filter(Boolean);

    // Merge with existing seats
    setGeneratedSeats((prev) => {
      const existingIds = new Set(prev.map((s) => s._id));
      const fresh = saved.filter((s) => !existingIds.has(s._id));
      return [...prev, ...fresh].sort((a, b) =>
        a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true, sensitivity: 'base' })
      );
    });

    setLayout([]);
    setGenerating(false);
    setProgress("");
    setProgressCount({ done: 0, total: 0 });

    if (saved.length === 0) {
      setError("No new seats were saved. All seats may already exist for this screen.");
    }
  };

  // ── Clear ─────────────────────────────────────────────────
  const clearLayout = () => {
    setLayout([]);
    setRowName("");
    setSeatCount("");
    setError("");
    setProgress("");
    setProgressCount({ done: 0, total: 0 });
  };

  const resetAll = () => {
    clearLayout();
    setGeneratedSeats([]);
    setSelectedScreen("");
    setHallId("");
  };

  // ── Build QR URL ──────────────────────────────────────────
  const buildQRUrl = (seat) =>
    `${CUSTOMER_BASE}?seatId=${seat._id}&hallId=${seat.hallId}&cinemaId=${theaterId}&screen=${selectedScreen}&seat=${seat.seatNumber}`;

  // ── Loading / guard screens ───────────────────────────────
  if (theaterLoading) {
    return (
      <div className="qr-page">
        <div className="qr-loader">
          <div className="qr-spinner" />
          <p>Loading theater…</p>
        </div>
      </div>
    );
  }

  if (role !== "owner" && role !== "worker") {
    return (
      <div className="qr-page">
        <div className="qr-error-card">
          <span className="qr-error-icon">🔒</span>
          <h3>Access Denied</h3>
          <p>Only owners and workers can access this page.</p>
        </div>
      </div>
    );
  }

  if (!theaterData) {
    return (
      <div className="qr-page">
        <div className="qr-error-card">
          <span className="qr-error-icon">🎭</span>
          <h3>No Theater Found</h3>
          <p>{error || "Please go back and select a theater."}</p>
          <button className="btn-back" onClick={() => navigate(-1)}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalPending = layout.reduce((s, r) => s + r.count, 0);
  const screenCount = Number(theaterData.totalScreens || 1);

  return (
    <div className="qr-page">
      {/* ── Header ── */}
      <header className="qr-header">
        <div className="qr-header-left">
          <div>
            <h1 className="qr-title">▣ QR Generator</h1>
            <p className="qr-subtitle">
              {theaterData.name}
              {theaterData.branchName ? ` · ${theaterData.branchName}` : ""}
              {theaterData.city ? ` · ${theaterData.city}` : ""}
            </p>
          </div>
        </div>
        {generatedSeats.length > 0 && (
          <button className="btn-print" onClick={() => window.print()}>
            🖨 Print {generatedSeats.length} QR Codes
          </button>
        )}
      </header>

      <div className="qr-layout">
        {/* ── Left Panel: Controls ── */}
        <aside className="qr-sidebar">
          {/* Screen selector */}
          <section className="qr-section">
            <label className="qr-label">
              <span className="qr-label-num">01</span>
              Select Screen
            </label>
            <select
              className="qr-select"
              value={selectedScreen}
              onChange={(e) => setSelectedScreen(e.target.value)}
              disabled={hallLoading || generating}
            >
              <option value="">— Choose a screen —</option>
              {Array.from({ length: screenCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={String(n)}>
                  Screen {n}
                </option>
              ))}
            </select>
            {hallLoading && (
              <p className="qr-hint qr-hint--loading">
                <span className="dot-pulse" /> Linking hall to screen…
              </p>
            )}
            {hallId && !hallLoading && (
              <p className="qr-hint qr-hint--ok">
                ✓ Screen {selectedScreen} ready
                {generatedSeats.length > 0 &&
                  ` · ${generatedSeats.length} existing seats`}
              </p>
            )}
          </section>

          {/* Row builder */}
          <section className="qr-section">
            <label className="qr-label">
              <span className="qr-label-num">02</span>
              Add Rows
            </label>
            <div className="qr-row-inputs">
              <input
                className="qr-input"
                placeholder="Row  (A, B, C…)"
                value={rowName}
                onChange={(e) => setRowName(e.target.value)}
                maxLength={3}
                disabled={!hallId || generating}
                onKeyDown={(e) => e.key === "Enter" && addRowToLayout()}
              />
              <input
                className="qr-input qr-input--sm"
                type="number"
                placeholder="# Seats"
                value={seatCount}
                onChange={(e) => setSeatCount(e.target.value)}
                min="1"
                max="50"
                disabled={!hallId || generating}
                onKeyDown={(e) => e.key === "Enter" && addRowToLayout()}
              />
              <button
                className="btn-add-row"
                onClick={addRowToLayout}
                disabled={!hallId || generating}
              >
                + Add
              </button>
            </div>

            {/* Layout preview */}
            {layout.length > 0 && (
              <div className="layout-preview">
                {layout.map((r, i) => (
                  <div key={i} className="layout-row-item">
                    <div className="layout-row-label">
                      <span className="row-badge">Row {r.row}</span>
                      <span className="row-seats">
                        {r.count} seat{r.count > 1 ? "s" : ""} →{" "}
                        {r.row}1 … {r.row}{r.count}
                      </span>
                    </div>
                    <button
                      className="btn-remove-row"
                      onClick={() => removeRow(i)}
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <p className="layout-total">
                  {totalPending} new seat{totalPending !== 1 ? "s" : ""} to generate
                </p>
              </div>
            )}
          </section>

          {/* Errors & Progress */}
          {error && <p className="qr-error">{error}</p>}
          {progress && (
            <div className="qr-progress">
              <p>{progress}</p>
              {progressCount.total > 0 && (
                <div className="progress-bar-wrap">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.round(
                        (progressCount.done / progressCount.total) * 100
                      )}%`,
                    }}
                  />
                  <span className="progress-label">
                    {progressCount.done} / {progressCount.total}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="qr-actions">
            <button
              className="btn-generate"
              onClick={generateSeats}
              disabled={generating || !hallId || layout.length === 0}
            >
              {generating ? (
                <>
                  <span className="btn-spinner" /> Generating…
                </>
              ) : (
                "⚡ Generate & Save Seats"
              )}
            </button>
            <button
              className="btn-clear"
              onClick={clearLayout}
              disabled={generating}
            >
              Clear Layout
            </button>
            {(generatedSeats.length > 0 || selectedScreen) && (
              <button
                className="btn-reset"
                onClick={resetAll}
                disabled={generating}
              >
                ↺ Reset Screen
              </button>
            )}
          </div>
        </aside>

        {/* ── Right Panel: QR Grid ── */}
        <main className="qr-main">
          {generatedSeats.length === 0 && !generating && (
            <div className="qr-empty">
              <div className="qr-empty-icon">🎟</div>
              <p>
                {selectedScreen
                  ? "No seats yet. Add rows and generate."
                  : "Select a screen to get started."}
              </p>
            </div>
          )}

          {generatedSeats.length > 0 && (
            <>
              <div className="qr-grid-header">
                <h2>
                  Screen {selectedScreen} — {generatedSeats.length} Seats
                </h2>
                <p className="qr-grid-subtitle">
                  {theaterData.branchName || theaterData.name}
                </p>
              </div>

              <div className="qr-grid print-area">
                {generatedSeats.map((seat) => {
                  const url = buildQRUrl(seat);
                  return (
                    <div key={seat._id} className="qr-card">
                      <div className="qr-card-inner">
                        <QRCodeCanvas
                          ref={(el) => (qrRefs.current[seat._id] = el)}
                          value={url}
                          size={110}
                          bgColor="#ffffff"
                          fgColor="#1a1a2e"
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      <div className="qr-card-info">
                        <span className="qr-seat-number">{seat.seatNumber}</span>
                        <span className="qr-screen-label">
                          Screen {selectedScreen}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default QRGenerator;