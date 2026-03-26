import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerHome.css";
import logo from "../PopSeat_Logo.png";

// APIs USED:
//   GET    /api/owner/cinemas              ✅ confirmed
//   GET    /api/owner/workers/:cinemaId    ✅ confirmed
//   DELETE /api/owner/delete-worker/:id   ✅ confirmed
//   POST   /api/owner/create-worker       ✅ confirmed
//   GET    /api/subscription/my           ✅ confirmed
//   DELETE /api/cinema/:id               ✅ confirmed

const API_BASE = "https://popseat.onrender.com";

const formatTime = (time) => {
  if (!time) return "";
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    localStorage.getItem("ownerToken") || localStorage.getItem("token") || ""
  }`,
});

// ─────────────────────────────────────────────────────
// FIX 1: ConfirmModal moved OUTSIDE OwnerHome.
// Defining it inside caused it to remount on every render,
// breaking animations and losing internal state.
// ─────────────────────────────────────────────────────
const ConfirmModal = ({ confirmDelete, onCancel, onConfirm }) => {
  if (!confirmDelete) return null;
  const { type, label } = confirmDelete;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 28,
        maxWidth: 320, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}>
        <p style={{ marginBottom: 8, fontSize: 15 }}>
         {type === "theater" ? `Delete theater "${label}"?` : `Delete worker "${label}"?`}
        </p>
        {/* FIX 5: Warn user that theater delete is UI-only (no API yet) */}
        {/* {type === "theater" && (
          <p style={{ fontSize: 12, color: "#e65100", marginBottom: 16 }}>
            ⚠️ This only removes the theater from your current view.
            The theater record will still exist in the database until a delete API is available.
          </p>
        )} */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer", background: "#f5f5f5" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: "#e55", color: "#fff" }}
          >
            {type === "theater" ? "Remove from view" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

const OwnerHome = () => {
  const navigate   = useNavigate();
  const ownerToken = localStorage.getItem("ownerToken") || localStorage.getItem("token") || "";
  const role       = (localStorage.getItem("ownerRole") || localStorage.getItem("role") || "").toLowerCase();

  const [theaters,      setTheaters]      = useState([]);
  const [workersMap,    setWorkersMap]    = useState({});
  const [workerInputs,  setWorkerInputs]  = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [deleteLoading, setDeleteLoading] = useState({});
  const [error,         setError]         = useState("");
  const [subscription,  setSubscription]  = useState(null);
  const [subLoading,    setSubLoading]    = useState(true);
  const [subError,      setSubError]      = useState("");

  // FIX 8: ref to track mounted state for async fetch cleanup
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // FIX 6: auto-clear non-critical errors after 5 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => {
      if (isMounted.current) setError("");
    }, 5000);
    return () => clearTimeout(t);
  }, [error]);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!ownerToken || role !== "owner") {
      navigate("/login", { replace: true });
    }
  }, [ownerToken, role, navigate]);

  /* ═══════════════════════════════
     GET /api/subscription/my ✅
  ═══════════════════════════════ */
  const loadSubscription = useCallback(async () => {
    setSubLoading(true);
    setSubError("");
    try {
      const res  = await fetch(`${API_BASE}/api/subscription/my`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        const sub = data.subscription || data.plan || data.data || null;
        setSubscription(sub);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error("Subscription fetch error:", err);
      if (!isMounted.current) return;
      setSubError("Could not load subscription status.");
      // FIX 4: Removed dead ownerPlans localStorage fallback —
      // nothing in the app ever writes "ownerPlans" so the cache
      // was always empty. Removed to avoid misleading silent failures.
      setSubscription(null);
    } finally {
      if (isMounted.current) setSubLoading(false);
    }
  }, []);

  /* ═══════════════════════════════
     GET /api/owner/cinemas ✅
  ═══════════════════════════════ */
  const loadCinemas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/owner/cinemas`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to load theaters.");
        return;
      }
      setTheaters(data.cinemas || []);
    } catch (err) {
      console.error("Load cinemas error:", err);
      if (isMounted.current) setError("Network error. Please check your connection.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  /* ═══════════════════════════════
     GET /api/owner/workers/:cinemaId ✅
     FIX 8: Uses AbortController to cancel
     in-flight requests when component unmounts.
  ═══════════════════════════════ */
  const loadWorkers = useCallback(async (cinemaId, signal) => {
    try {
      const res  = await fetch(
        `${API_BASE}/api/owner/workers/${cinemaId}`,
        { headers: authHeaders(), signal }
      );
      const data = await res.json();
      if (data.success && isMounted.current) {
        setWorkersMap((prev) => ({
          ...prev,
          [cinemaId]: data.workers || [],
        }));
      }
    } catch (err) {
      if (err.name === "AbortError") return; // expected on unmount
      console.warn("Load workers error:", err);
    }
  }, []);

  // FIX 8: Cancel all worker fetches on unmount
  useEffect(() => {
    if (theaters.length === 0) return;
    const controller = new AbortController();
    theaters.forEach((t) => loadWorkers(t._id, controller.signal));
    return () => controller.abort();
  }, [theaters, loadWorkers]);

  useEffect(() => {
    if (ownerToken && role === "owner") {
      loadSubscription();
      loadCinemas();
    }
  }, [loadSubscription, loadCinemas]);

  /* ── Helpers ── */
  const setAction = (key, val) =>
    setActionLoading((prev) => ({ ...prev, [key]: val }));

  const updateWorkerInput = (cinemaId, field, value) =>
    setWorkerInputs((prev) => ({
      ...prev,
      [cinemaId]: { ...(prev[cinemaId] || {}), [field]: value },
    }));

  /* ── Subscription helpers ── */

  // FIX 2: Safe null check for expiresAt.
  // Before: new Date(undefined) returns Invalid Date which is never > new Date(),
  // so a valid "active" subscription with no expiry was wrongly treated as expired.
  const isSubscriptionActive =
    subscription?.status === "active" &&
    (!subscription?.expiresAt || new Date(subscription.expiresAt) > new Date());

  const theatersAllowed    = subscription?.theatersAllowed || 0;
  const canAddMoreTheaters = isSubscriptionActive && theaters.length < theatersAllowed;

  const formatExpiry = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  /* ═══════════════════════════════
     POST /api/owner/create-worker ✅
  ═══════════════════════════════ */
  const handleAddWorker = async (cinemaId) => {
    const { name, email, password } = workerInputs[cinemaId] || {};
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      setError("Please fill in worker name, email and password.");
      return;
    }
    setAction(`add-${cinemaId}`, true);
    setError("");
    try {
      const res  = await fetch(`${API_BASE}/api/owner/create-worker`, {
        method : "POST",
        headers: authHeaders(),
        body   : JSON.stringify({
          name    : name.trim(),
          email   : email.trim().toLowerCase(),
          password: password.trim(),
          cinemaId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to create worker.");
        return;
      }
      // FIX 3: Validate data.worker exists before pushing.
      // API docs confirm { success, worker: { ... } } response shape.
      // If somehow worker is missing, fall back to re-fetching from server.
      if (data.worker) {
        setWorkersMap((prev) => ({
          ...prev,
          [cinemaId]: [...(prev[cinemaId] || []), data.worker],
        }));
      } else {
        // Fallback: reload workers from server to stay in sync
        await loadWorkers(cinemaId);
      }
      setWorkerInputs((prev) => ({
        ...prev,
        [cinemaId]: { name: "", email: "", password: "" },
      }));
    } catch (err) {
      console.error("Create worker error:", err);
      setError("Network error. Could not create worker.");
    } finally {
      setAction(`add-${cinemaId}`, false);
    }
  };

  /* ═══════════════════════════════
     DELETE /api/owner/delete-worker/:id ✅
  ═══════════════════════════════ */
  const handleDeleteWorker = async (cinemaId, workerId) => {
    setDeleteLoading((prev) => ({ ...prev, [workerId]: true }));
    setConfirmDelete(null);
    try {
      const res  = await fetch(
        `${API_BASE}/api/owner/delete-worker/${workerId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) {
        setWorkersMap((prev) => ({
          ...prev,
          [cinemaId]: (prev[cinemaId] || []).filter(
            (w) => (w._id || w.id) !== workerId
          ),
        }));
      } else {
        setError(data.message || "Failed to delete worker.");
      }
    } catch (err) {
      console.error("Delete worker error:", err);
      setError("Network error. Could not delete worker.");
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [workerId]: false }));
    }
  };

  /* ═══════════════════════════════
     DELETE THEATER
     ❌ No API exists yet in docs.
     FIX 5: Only removes from local UI view.
     Backend needs: DELETE /api/cinema/:id
  ═══════════════════════════════ */
 const handleDeleteTheater = async (cinemaId) => {
  setConfirmDelete(null);
  setDeleteLoading((prev) => ({ ...prev, [cinemaId]: true }));
  try {
    const res  = await fetch(`${API_BASE}/api/cinema/${cinemaId}`, {
      method : "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      setTheaters((prev) => prev.filter((t) => t._id !== cinemaId));
    } else {
      setError(data.message || "Failed to delete theater.");
    }
  } catch (err) {
    console.error("Delete theater error:", err);
    setError("Network error. Could not delete theater.");
  } finally {
    setDeleteLoading((prev) => ({ ...prev, [cinemaId]: false }));
  }
};
  /* ── Open dashboard ── */
  const openDashboard = (theater) => {
    if (!theater.isActive) {
      setError("This theater is pending Super Admin approval. ⏳");
      return;
    }
    navigate(`/theater/overview?theaterId=${theater._id}`, {
      state: { theaterId: theater._id },
    });
  };

  /* ── Handle Add Theater ── */
  const handleAddTheater = () => {
    if (!isSubscriptionActive) {
      setError("You need an active plan to add theaters. Please subscribe first.");
      return;
    }
    if (!canAddMoreTheaters) {
      setError(
        `Your current plan allows ${theatersAllowed} theater(s). ` +
        `You've reached the limit. Upgrade your plan to add more.`
      );
      return;
    }
    navigate("/theater-register");
  };

  /* ── Logout ── */
  const handleLogout = () => {
    ["ownerToken", "token", "ownerEmail", "email", "ownerRole", "role"].forEach(
      (k) => localStorage.removeItem(k)
    );
    navigate("/login");
  };

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div className="owner-loading">
        <div className="loading-inner">
          <div className="loading-icon">🎬</div>
          <p>Loading your theaters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-container">

      {/* FIX 1: ConfirmModal is now a proper external component */}
      <ConfirmModal
        confirmDelete={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const { type, id, cinemaId } = confirmDelete;
          if (type === "theater") handleDeleteTheater(id);
          else handleDeleteWorker(cinemaId, id);
        }}
      />

      {/* HEADER */}
      <div className="owner-header">
        <h1 className="owner-title">🎬 Owner Control Panel</h1>
        <div className="brand">
          <img src={logo} alt="PopSeat Logo" />
          <h1>PopSeat</h1>
        </div>
        <div className="header-buttons">
          <button
            onClick={handleAddTheater}
            disabled={!isSubscriptionActive || !canAddMoreTheaters}
            title={
              !isSubscriptionActive
                ? "Subscribe to add theaters"
                : !canAddMoreTheaters
                ? `Plan limit: ${theatersAllowed} theater(s)`
                : "Add a new theater"
            }
          >
            + Add Theater
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* SUBSCRIPTION BANNER */}
      {!subLoading && (
        <div style={{
          margin: "0 16px 12px", padding: "10px 16px", borderRadius: 8,
          background: isSubscriptionActive ? "#f0fff4" : "#fff8f0",
          border: `1px solid ${isSubscriptionActive ? "#b2dfdb" : "#ffe0b2"}`,
          fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          {isSubscriptionActive ? (
            <>
              <span style={{ color: "#2e7d32" }}>
                ✅ Active Plan — {theatersAllowed} theater(s) allowed
                {subscription?.expiresAt && ` · Expires ${formatExpiry(subscription.expiresAt)}`}
                {` · ${theaters.length}/${theatersAllowed} used`}
              </span>
              <button
                onClick={() => navigate("/owner/plan")}
                style={{ background: "none", border: "none", color: "#1976d2", cursor: "pointer", fontSize: 12 }}
              >
                Upgrade
              </button>
            </>
          ) : (
            <>
              <span style={{ color: "#e65100" }}>
                ⚠️ {subError || "No active plan. Subscribe to manage theaters."}
              </span>
              <button
                onClick={() => navigate("/owner/plan")}
                style={{ background: "#e65100", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, padding: "4px 10px", borderRadius: 6 }}
              >
                Subscribe
              </button>
            </>
          )}
        </div>
      )}

      {/* ERROR BANNER — FIX 6: auto-clears after 5s via useEffect above */}
      {error && (
        <div style={{
          background: "#fff3f3", border: "1px solid #fbb", borderRadius: 8,
          padding: "10px 16px", margin: "0 16px 16px", color: "#c00", fontSize: 13,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {theaters.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏛️</div>
          <p className="empty-title">No theaters found</p>
          <p className="empty-sub">
            {isSubscriptionActive
              ? <><strong>"+ Add Theater"</strong> to register one.</>
              : <>Subscribe to a plan to start adding theaters.</>
            }
          </p>
        </div>
      ) : (
        <div className="theater-grid">
          {theaters.map((t) => {
            const workers = workersMap[t._id] || [];
            const wInput  = workerInputs[t._id] || {};

            return (
              <div key={t._id} className="theater-card">

                <div className="card-header">
                  <h2 className="card-title">{t.name}</h2>
                  <span className={`status-badge ${t.isActive ? "active" : "pending"}`}>
                    {t.isActive ? "● Active" : "● Pending"}
                  </span>
                </div>

                <div className="card-info">
                  <div className="info-pill">
                    <span className="pill-label">Branch</span>
                    <span className="pill-value">{t.branchName || "—"}</span>
                  </div>
                  <div className="info-pill">
                    <span className="pill-label">City</span>
                    <span className="pill-value">{t.city || "—"}</span>
                  </div>
                  <div className="info-pill">
                    <span className="pill-label">Screens</span>
                    <span className="pill-value">{t.totalScreens || "—"}</span>
                  </div>
                  {t.openingTime && (
                    <div className="info-pill">
                      <span className="pill-label">Hours</span>
                      <span className="pill-value">
                        {formatTime(t.openingTime)} – {formatTime(t.closingTime)}
                      </span>
                    </div>
                  )}
                  {t.address && (
                    <div className="info-pill full-width">
                      <span className="pill-label">📍 Address</span>
                      <span className="pill-value">{t.address}</span>
                    </div>
                  )}
                </div>

                <div className="theater-actions">
                  <button className="btn-dashboard" onClick={() => openDashboard(t)}>
                    Open Dashboard
                  </button>
                  <button
                    className="btn-delete-theater"
                    onClick={() =>
                      setConfirmDelete({ type: "theater", id: t._id, label: t.name })
                    }
                  >
                    Delete
                  </button>
                </div>

                {/* WORKERS SECTION */}
                <div className="workers-section">
                  <div className="workers-section-title">
                    <span>👷 Workers</span>
                    <span className="worker-count">{workers.length} added</span>
                  </div>

                  <div className="worker-form">
                    <input
                      className="worker-input"
                      placeholder="Worker Name"
                      value={wInput.name || ""}
                      onChange={(e) => updateWorkerInput(t._id, "name", e.target.value)}
                    />
                    <input
                      className="worker-input"
                      placeholder="Worker Email"
                      type="email"
                      autoComplete="off"
                      value={wInput.email || ""}
                      onChange={(e) => updateWorkerInput(t._id, "email", e.target.value)}
                    />
                    {/* FIX 7: autoComplete="new-password" prevents browser autofill
                        from overwriting owner credentials into worker password field */}
                    <input
                      className="worker-input"
                      placeholder="Worker Password"
                      type="password"
                      autoComplete="new-password"
                      value={wInput.password || ""}
                      onChange={(e) => updateWorkerInput(t._id, "password", e.target.value)}
                    />
                    <button
                      className="btn-add-worker"
                      onClick={() => handleAddWorker(t._id)}
                      disabled={!!actionLoading[`add-${t._id}`]}
                    >
                      {actionLoading[`add-${t._id}`] ? "Adding..." : "+ Add Worker"}
                    </button>
                  </div>

                  {workers.length > 0 ? (
                    <div className="worker-list">
                      {workers.map((w) => {
                        const wId = w._id || w.id;
                        return (
                          <div key={wId} className="worker-row">
                            <div className="worker-avatar">
                              {(w.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="worker-info">
                              <span className="worker-name">{w.name}</span>
                              <span className="worker-email">{w.email}</span>
                            </div>
                            <button
                              className="btn-delete-worker"
                              onClick={() =>
                                setConfirmDelete({
                                  type: "worker", id: wId,
                                  cinemaId: t._id, label: w.name,
                                })
                              }
                              disabled={!!deleteLoading[wId]}
                            >
                              {deleteLoading[wId] ? "..." : "🗑️"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-workers-text">No workers added yet</p>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default OwnerHome;