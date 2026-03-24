import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./EditTheater.css";

// APIs USED:
//   GET /api/cinema/:id   ✅ confirmed
//   PUT /api/cinema/:id   ✅ confirmed
//
// FIXES IN THIS VERSION:
//   FIX 1: email field added to form + PUT body
//   FIX 2: banner + theaterLogo preserved in PUT body (were silently dropped)
//   FIX 3: contactNumber enforces digits-only on input change

const API_BASE = "https://popseat.onrender.com/api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization : `Bearer ${
    localStorage.getItem("ownerToken") || localStorage.getItem("token") || ""
  }`,
});

const capitalizeSmart = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
};

const CAPITALIZE_FIELDS = ["ownerName", "name", "branchName", "city", "address"];
const REQUIRED_FIELDS   = ["name", "ownerName", "city", "contactNumber"];

const EditTheater = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params    = new URLSearchParams(location.search);
  const theaterId =
    params.get("theaterId")   ||
    location.state?.theaterId || "";

  const [theaterData, setTheaterData] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  /* ═══════════════════════════════════════
     GET /api/cinema/:id ✅
     Response: { success, cinema: { _id, name,
       branchName, city, ownerName, totalScreens,
       openingTime, closingTime, contactNumber,
       address, email, banner, theaterLogo, isActive } }
  ═══════════════════════════════════════ */
  useEffect(() => {
    if (!theaterId) {
      setError("No theater ID found. Please go back and try again.");
      setLoading(false);
      return;
    }

    const fetchTheater = async () => {
      setLoading(true);
      setError("");
      try {
        const res  = await fetch(`${API_BASE}/cinema/${theaterId}`, {
          headers: authHeaders(),
        });
        const data = await res.json();

        if (data.success && data.cinema) {
          setTheaterData(data.cinema);
        } else {
          setError(data.message || "Theater not found.");
        }
      } catch (err) {
        console.error("Error loading theater:", err);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchTheater();
  }, [theaterId]);

  /* ── Field change handler ── */
  const handleChange = (e) => {
    const { name, value } = e.target;

    // FIX 3: Enforce digits-only for contactNumber at input time
    // Don't wait until submit validation — filter non-digits immediately
    if (name === "contactNumber") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setTheaterData((prev) => ({ ...prev, contactNumber: digitsOnly }));
      setError("");
      setSuccess("");
      return;
    }

    setTheaterData((prev) => ({
      ...prev,
      [name]: CAPITALIZE_FIELDS.includes(name) ? capitalizeSmart(value) : value,
    }));
    setError("");
    setSuccess("");
  };

  /* ── Validation ── */
  const validate = () => {
    for (const field of REQUIRED_FIELDS) {
      if (!theaterData[field]?.trim()) {
        return `${field.replace(/([A-Z])/g, " $1").trim()} is required.`;
      }
    }
    if (!/^\d{10}$/.test(theaterData.contactNumber?.trim() || "")) {
      return "Contact number must be exactly 10 digits.";
    }
    if (
      theaterData.totalScreens &&
      (isNaN(theaterData.totalScreens) || Number(theaterData.totalScreens) < 1)
    ) {
      return "Total screens must be a positive number.";
    }
    // FIX 1: basic email format check if provided
    if (
      theaterData.email?.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(theaterData.email.trim())
    ) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  /* ═══════════════════════════════════════
     PUT /api/cinema/:id ✅
     Response: { success, cinema: { ...updatedFields } }
     FIX 1: Added email to body
     FIX 2: Added banner + theaterLogo to body so they aren't silently cleared
  ═══════════════════════════════════════ */
  const handleSave = async () => {
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/cinema/${theaterData._id}`, {
        method : "PUT",
        headers: authHeaders(),
        body   : JSON.stringify({
          name         : theaterData.name,
          branchName   : theaterData.branchName,
          ownerName    : theaterData.ownerName,
          city         : theaterData.city,
          address      : theaterData.address,
          contactNumber: theaterData.contactNumber,
          totalScreens : Number(theaterData.totalScreens),
          openingTime  : theaterData.openingTime,
          closingTime  : theaterData.closingTime,
          // FIX 1: email was missing — now included
          email        : theaterData.email?.trim() || "",
          // FIX 2: preserve banner + logo so they aren't cleared on save
          banner       : theaterData.banner       || "",
          theaterLogo  : theaterData.theaterLogo  || "",
        }),
      });
      const data = await res.json();

      if (data.success) {
        setTheaterData(data.cinema);
        setSuccess("Theater updated successfully ✅");
        setTimeout(() => navigate(-1), 1600);
      } else {
        setError(data.message || "Update failed. Please try again.");
      }
    } catch (err) {
      console.error("Update error:", err);
      setError("Network error. Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="edit-page">
        <div className="edit-container edit-container--loading">
          <div className="edit-spinner" />
          <p className="edit-loading-text">Loading theater details...</p>
        </div>
      </div>
    );
  }

  /* ── No data ── */
  if (!theaterData) {
    return (
      <div className="edit-page">
        <div className="edit-container">
          <p className="edit-msg edit-msg--error">{error || "Theater not found."}</p>
          <button className="edit-back-btn" onClick={() => navigate(-1)}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="edit-page">
      <div className="edit-container">

        {/* HEADER */}
        <div className="edit-header">
          <button className="edit-back-btn edit-back-btn--icon" onClick={() => navigate(-1)}>
            ←
          </button>
          <div>
            <h2 className="edit-title">Edit Theater</h2>
            <p className="edit-subtitle">
              {theaterData.name}{theaterData.branchName ? ` · ${theaterData.branchName}` : ""}
            </p>
          </div>
        </div>

        {success && <div className="edit-msg edit-msg--success">{success}</div>}
        {error   && <div className="edit-msg edit-msg--error">{error}</div>}

        {/* ── BASIC INFORMATION ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">Basic Information</h3>

          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">
                Owner Name <span className="edit-required">*</span>
              </label>
              <input
                className="edit-input"
                name="ownerName"
                value={theaterData.ownerName || ""}
                onChange={handleChange}
                placeholder="e.g. Hitesh Patel"
                autoComplete="name"
              />
            </div>
            <div className="edit-field">
              <label className="edit-label">
                Theater Name <span className="edit-required">*</span>
              </label>
              <input
                className="edit-input"
                name="name"
                value={theaterData.name || ""}
                onChange={handleChange}
                placeholder="e.g. PVR Cinemas"
              />
            </div>
          </div>

          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Branch Name</label>
              <input
                className="edit-input"
                name="branchName"
                value={theaterData.branchName || ""}
                onChange={handleChange}
                placeholder="e.g. PVR Ahmedabad"
              />
            </div>
            <div className="edit-field">
              <label className="edit-label">
                City <span className="edit-required">*</span>
              </label>
              <input
                className="edit-input"
                name="city"
                value={theaterData.city || ""}
                onChange={handleChange}
                placeholder="e.g. Ahmedabad"
              />
            </div>
          </div>

          <div className="edit-field">
            <label className="edit-label">Full Address</label>
            <textarea
              className="edit-textarea"
              name="address"
              value={theaterData.address || ""}
              onChange={handleChange}
              placeholder="e.g. Alpha One Mall, Vastrapur"
            />
          </div>
        </div>

        {/* ── CONTACT & OPERATIONS ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">Contact & Operations</h3>

          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">
                Contact Number <span className="edit-required">*</span>
              </label>
              {/* FIX 3: digits enforced via handleChange, not just inputMode hint */}
              <input
                className="edit-input"
                name="contactNumber"
                value={theaterData.contactNumber || ""}
                onChange={handleChange}
                placeholder="10-digit number"
                maxLength={10}
                inputMode="numeric"
              />
            </div>
            <div className="edit-field">
              <label className="edit-label">Total Screens</label>
              <input
                className="edit-input"
                name="totalScreens"
                value={theaterData.totalScreens || ""}
                onChange={handleChange}
                placeholder="e.g. 5"
                inputMode="numeric"
                type="number"
                min="1"
              />
            </div>
          </div>

          {/* FIX 1: Email field — was in API response but had no UI input */}
          <div className="edit-field">
            <label className="edit-label">Email Address</label>
            <input
              className="edit-input"
              name="email"
              type="email"
              value={theaterData.email || ""}
              onChange={handleChange}
              placeholder="e.g. theater@example.com"
              autoComplete="email"
            />
          </div>

          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Opening Time</label>
              <input
                className="edit-input edit-input--time"
                type="time"
                name="openingTime"
                value={theaterData.openingTime || ""}
                onChange={handleChange}
              />
            </div>
            <div className="edit-field">
              <label className="edit-label">Closing Time</label>
              <input
                className="edit-input edit-input--time"
                type="time"
                name="closingTime"
                value={theaterData.closingTime || ""}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* ── MEDIA (read-only display, not editable without upload endpoint) ── */}
        {/* FIX 2: Show existing banner/logo so owner knows what's stored.
            These are passed through in the PUT body unchanged.
            To make them editable, a file upload endpoint is needed. */}
        {(theaterData.theaterLogo || theaterData.banner) && (
          <div className="edit-section">
            <h3 className="edit-section-title">
              Media
              <span className="edit-section-badge">Stored — not editable here</span>
            </h3>
            <div className="edit-media-row">
              {theaterData.theaterLogo && (
                <div className="edit-media-item">
                  <p className="edit-media-label">Theater Logo</p>
                  <img
                    src={theaterData.theaterLogo}
                    alt="Theater Logo"
                    className="edit-media-img"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              )}
              {theaterData.banner && (
                <div className="edit-media-item edit-media-item--wide">
                  <p className="edit-media-label">Banner</p>
                  <img
                    src={theaterData.banner}
                    alt="Theater Banner"
                    className="edit-media-img edit-media-img--banner"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* SAVE BUTTON */}
        <button
          className="edit-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <span className="edit-save-loading">
              <span className="edit-save-spinner" />
              Saving...
            </span>
          ) : (
            "Save Changes"
          )}
        </button>

      </div>
    </div>
  );
};

export default EditTheater;