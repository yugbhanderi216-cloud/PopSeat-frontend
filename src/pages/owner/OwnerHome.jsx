import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerHome.css";
import logo from "../PopSeat_Logo.png";

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
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

const OwnerHome = () => {
  const navigate = useNavigate();
  const ownerEmail = localStorage.getItem("email");
  const role = localStorage.getItem("role")?.toLowerCase();

  const [theaters, setTheaters] = useState([]);
  const [workersMap, setWorkersMap] = useState({});
  const [workerInputs, setWorkerInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [deleteLoading, setDeleteLoading] = useState({});

  useEffect(() => {
    if (!ownerEmail || role !== "owner") navigate("/login");
  }, [ownerEmail, role, navigate]);

  const loadAllWorkers = useCallback(() => {
    const cacheKey = `workers_cache_${ownerEmail}`;
    const stored = JSON.parse(localStorage.getItem(cacheKey) || "{}");
    setWorkersMap(stored);
  }, [ownerEmail]);

  const loadCinemas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/cinema`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const mine = (data.cinemas || []).filter(
          (c) => c.email === ownerEmail || c.ownerEmail === ownerEmail
        );
        setTheaters(mine);
        loadAllWorkers();
      } else {
        alert("Failed to load cinemas: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Load cinemas error:", err);
      alert("Network error loading cinemas.");
    } finally {
      setLoading(false);
    }
  }, [ownerEmail, loadAllWorkers]);

  useEffect(() => {
    if (ownerEmail && role === "owner") loadCinemas();
  }, [loadCinemas]);

  const setAction = (key, val) =>
    setActionLoading((prev) => ({ ...prev, [key]: val }));

  const updateWorkerInput = (theaterId, field, value) =>
    setWorkerInputs((prev) => ({
      ...prev,
      [theaterId]: { ...(prev[theaterId] || {}), [field]: value },
    }));

  const handleAddWorker = async (theaterId) => {
    const { name, email, password } = workerInputs[theaterId] || {};
    if (!name || !email || !password) {
      alert("Enter worker name, email & password");
      return;
    }
    setAction(`worker-${theaterId}`, true);
    try {
      const res = await fetch(`${API_BASE}/api/owner/create-worker`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const worker = data.worker;
        const cacheKey = `workers_cache_${ownerEmail}`;
        setWorkersMap((prev) => {
          const updated = { ...prev, [theaterId]: [...(prev[theaterId] || []), worker] };
          localStorage.setItem(cacheKey, JSON.stringify(updated));
          return updated;
        });
        setWorkerInputs((prev) => ({
          ...prev,
          [theaterId]: { name: "", email: "", password: "" },
        }));
        alert("Worker Created ✅");
      } else {
        alert(data.message || "Failed to create worker");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setAction(`worker-${theaterId}`, false);
    }
  };

  const handleDeleteWorker = async (theaterId, workerId) => {
    if (!window.confirm("Delete this worker?")) return;
    setDeleteLoading((prev) => ({ ...prev, [workerId]: true }));
    const removeFromState = () => {
      const cacheKey = `workers_cache_${ownerEmail}`;
      setWorkersMap((prev) => {
        const updated = {
          ...prev,
          [theaterId]: (prev[theaterId] || []).filter((w) => (w._id || w.id) !== workerId),
        };
        localStorage.setItem(cacheKey, JSON.stringify(updated));
        return updated;
      });
    };
    try {
      await fetch(`${API_BASE}/api/owner/delete-worker/${workerId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      removeFromState();
    } catch (err) {
      removeFromState();
      console.warn("Delete API error, removed locally:", err);
    } finally {
      setDeleteLoading((prev) => ({ ...prev, [workerId]: false }));
    }
  };

  const handleDeleteTheater = (theaterId) => {
    if (!window.confirm("Remove this theater from your view?")) return;
    setTheaters((prev) => prev.filter((t) => t._id !== theaterId));
  };

  const openDashboard = (theater) => {
    if (!theater.isActive) { alert("Waiting for Super Admin Approval ⏳"); return; }
    navigate("/theater/overview", { state: { theaterId: theater._id } });
  };

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

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

      {/* HEADER */}
      <div className="owner-header">
        <h1 className="owner-title">🎬 Owner Control Panel</h1>
        <div className="brand">
          <img src={logo} alt="PopSeat Logo" />
          <h1>PopSeat</h1>
        </div>
        <div className="header-buttons">
          <button onClick={() => navigate("/theater-register")}>+ Add Theater</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {theaters.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏛️</div>
          <p className="empty-title">No theaters found</p>
          <p className="empty-sub">Click <strong>"+ Add Theater"</strong> to register one.</p>
        </div>
      ) : (
        <div className="theater-grid">
          {theaters.map((t) => {
            const workers = workersMap[t._id] || [];
            const wInput = workerInputs[t._id] || {};

            return (
              <div key={t._id} className="theater-card">

                {/* THEATER INFO */}
                <div className="card-header">
                  <h2 className="card-title">{t.name || t.theaterName}</h2>
                  <span className={`status-badge ${t.isActive ? "active" : "pending"}`}>
                    {t.isActive ? "● Active" : "● Pending"}
                  </span>
                </div>

                <div className="card-info">
                  <div className="info-pill">
                    <span className="pill-label">Branch</span>
                    <span className="pill-value">{t.branchName || t.branch || "—"}</span>
                  </div>
                  <div className="info-pill">
                    <span className="pill-label">City</span>
                    <span className="pill-value">{t.city || t.location || "—"}</span>
                  </div>
                  <div className="info-pill">
                    <span className="pill-label">Screens</span>
                    <span className="pill-value">{t.totalScreens || t.screens || "—"}</span>
                  </div>
                  {t.openingTime && (
                    <div className="info-pill">
                      <span className="pill-label">Hours</span>
                      <span className="pill-value">{formatTime(t.openingTime)} – {formatTime(t.closingTime)}</span>
                    </div>
                  )}
                  {t.address && (
                    <div className="info-pill full-width">
                      <span className="pill-label">📍 Address</span>
                      <span className="pill-value">{t.address}</span>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="theater-actions">
                  <button className="btn-dashboard" onClick={() => openDashboard(t)}>
                    Open Dashboard
                  </button>
                  <button className="btn-delete-theater" onClick={() => handleDeleteTheater(t._id)}>
                    Delete
                  </button>
                </div>

                {/* WORKERS SECTION */}
                <div className="workers-section">
                  <div className="workers-section-title">
                    <span>👷 Workers</span>
                    <span className="worker-count">{workers.length} added</span>
                  </div>

                  {/* ADD WORKER FORM */}
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
                      value={wInput.email || ""}
                      onChange={(e) => updateWorkerInput(t._id, "email", e.target.value)}
                    />
                    <input
                      className="worker-input"
                      placeholder="Worker Password"
                      type="password"
                      value={wInput.password || ""}
                      onChange={(e) => updateWorkerInput(t._id, "password", e.target.value)}
                    />
                    <button
                      className="btn-add-worker"
                      onClick={() => handleAddWorker(t._id)}
                      disabled={!!actionLoading[`worker-${t._id}`]}
                    >
                      {actionLoading[`worker-${t._id}`] ? "Adding..." : "+ Add Worker"}
                    </button>
                  </div>

                  {/* WORKER LIST */}
                  {workers.length > 0 && (
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
                              onClick={() => handleDeleteWorker(t._id, wId)}
                              disabled={!!deleteLoading[wId]}
                            >
                              {deleteLoading[wId] ? "..." : "🗑️"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
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