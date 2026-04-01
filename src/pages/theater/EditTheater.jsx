import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./EditTheater.css";

// APIs USED:
//   GET  /api/cinema/:id                ✅ — load theater + bankDetails
//   PUT  /api/cinema/:id                ✅ — update theater (JSON or multipart)
//   POST /api/cinema/:id/bank-details   ✅ — save bank details

const API_BASE = "https://popseat.onrender.com/api";

const getAuthToken = () =>
  localStorage.getItem("ownerToken") || localStorage.getItem("token") || "";

const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const base = API_BASE.replace("/api", "");
  return `${base}/${url.replace(/^\//, '')}`;
};

// JSON headers — used for bank details POST and JSON PUT (no files)
const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

// Auth-only headers — used for FormData PUT (browser sets Content-Type + boundary)
const formAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
});

const capitalizeSmart = (text) => {
  if (!text) return "";
  return text.toLowerCase().replace(/(^|\s)\w/g, (l) => l.toUpperCase());
};

const CAPITALIZE_FIELDS = ["ownerName", "name", "branchName", "city", "address"];
const REQUIRED_FIELDS = ["name", "ownerName", "city", "contactNumber"];

const EditTheater = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const theaterId =
    params.get("theaterId") ||
    location.state?.theaterId ||
    localStorage.getItem("activeOwnerTheaterId") || "";

  const [theaterData, setTheaterData] = useState(null);
  const [logoFile, setLogoFile] = useState(null);   // File | null
  const [bannerFile, setBannerFile] = useState(null);   // File | null
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ═══════════════════════════════════════
     GET /api/cinema/:id
     Loads theater info + bankDetails from server
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
        const res = await fetch(`${API_BASE}/cinema/${theaterId}`, {
          headers: jsonAuthHeaders(),
        });
        const data = await res.json();

        if (data.success && data.cinema) {
          const c = data.cinema;
          const bank = c.bankDetails || {};

          setTheaterData({
            _id: c._id,
            name: c.name || "",
            branchName: c.branchName || "",
            ownerName: c.ownerName || "",
            city: c.city || "",
            address: c.address || "",
            contactNumber: c.contactNumber || "",
            totalScreens: c.totalScreens || "",
            email: c.email || "",
            openingTime: c.openingTime || "",
            closingTime: c.closingTime || "",
            theaterLogo: c.theaterLogo || "",   // existing URL for preview
            banner: c.banner || "",   // existing URL for preview
            // Bank details from server response
            accountHolder: bank.accountHolder || "",
            bankName: bank.bankName || "",
            accountNumber: bank.accountNumber || "",
            ifsc: bank.ifsc || "",
            upiId: bank.upiId || "",
          });
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

  /* ── Text field change ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setError("");
    setSuccess("");

    if (name === "contactNumber") {
      setTheaterData((prev) => ({
        ...prev,
        contactNumber: value.replace(/\D/g, "").slice(0, 10),
      }));
      return;
    }

    setTheaterData((prev) => ({
      ...prev,
      [name]: CAPITALIZE_FIELDS.includes(name) ? capitalizeSmart(value) : value,
    }));
  };

  /* ── File input — store File object, show local preview ── */
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;
    const file = files[0];
    const previewUrl = URL.createObjectURL(file);

    if (name === "theaterLogo") {
      setLogoFile(file);
      setTheaterData((prev) => ({ ...prev, theaterLogo: previewUrl }));
    } else if (name === "banner") {
      setBannerFile(file);
      setTheaterData((prev) => ({ ...prev, banner: previewUrl }));
    }
  };

  /* ── Validation ── */
  const validate = () => {
    for (const field of REQUIRED_FIELDS) {
      if (!theaterData[field]?.toString().trim()) {
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
    if (
      theaterData.email?.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(theaterData.email.trim())
    ) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  /* ── Has bank fields? ── */
  const hasBankDetails = () =>
    theaterData.accountHolder ||
    theaterData.bankName ||
    theaterData.accountNumber ||
    theaterData.ifsc;

  /* ═══════════════════════════════════════════════════════
     SAVE
     Step 1: PUT /api/cinema/:id
       — If files selected → multipart/form-data (Multer)
       — If no files       → JSON (lighter, no boundary overhead)
     Step 2: POST /api/cinema/:id/bank-details  (if filled)
  ═══════════════════════════════════════════════════════ */
  const handleSave = async () => {
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    try {
      const hasFiles = logoFile instanceof File || bannerFile instanceof File;
      let cinemaRes;

      if (hasFiles) {
        /* ── Multipart PUT (files present) ── */
        const formData = new FormData();
        formData.append("name", theaterData.name.trim());
        formData.append("branchName", theaterData.branchName.trim());
        formData.append("ownerName", theaterData.ownerName.trim());
        formData.append("city", theaterData.city.trim());
        formData.append("address", theaterData.address.trim());
        formData.append("contactNumber", theaterData.contactNumber.trim());
        formData.append("totalScreens", String(Number(theaterData.totalScreens) || 0));
        formData.append("email", theaterData.email?.trim() || "");
        formData.append("openingTime", theaterData.openingTime || "");
        formData.append("closingTime", theaterData.closingTime || "");

        // Append new files if selected; otherwise keep existing URL in body
        // so backend's cinemaData spread doesn't lose the old value
        if (logoFile instanceof File) {
          formData.append("theaterLogo", logoFile);
        } else {
          formData.append("theaterLogo", theaterData.theaterLogo || "");
        }
        if (bannerFile instanceof File) {
          formData.append("banner", bannerFile);
        } else {
          formData.append("banner", theaterData.banner || "");
        }

        cinemaRes = await fetch(`${API_BASE}/cinema/${theaterData._id}`, {
          method: "PUT",
          headers: formAuthHeaders(), // NO Content-Type — browser sets multipart boundary
          body: formData,
        });
      } else {
        /* ── JSON PUT (no new files) ── */
        const payload = {
          name: theaterData.name.trim(),
          branchName: theaterData.branchName.trim(),
          ownerName: theaterData.ownerName.trim(),
          city: theaterData.city.trim(),
          address: theaterData.address.trim(),
          contactNumber: theaterData.contactNumber.trim(),
          totalScreens: Number(theaterData.totalScreens) || 0,
          email: theaterData.email?.trim() || "",
          openingTime: theaterData.openingTime || "",
          closingTime: theaterData.closingTime || "",
          theaterLogo: theaterData.theaterLogo || "",
          banner: theaterData.banner || "",
        };

        cinemaRes = await fetch(`${API_BASE}/cinema/${theaterData._id}`, {
          method: "PUT",
          headers: jsonAuthHeaders(),
          body: JSON.stringify(payload),
        });
      }

      if (cinemaRes.status === 413) {
        setError("Image files are too large. Please choose smaller images (under 5 MB).");
        return;
      }
      if (cinemaRes.status === 401 || cinemaRes.status === 403) {
        setError("Session expired. Please log in again.");
        navigate("/login", { replace: true });
        return;
      }

      const cinemaData = await cinemaRes.json();

      if (!cinemaRes.ok || !cinemaData.success) {
        setError(cinemaData.message || "Update failed. Please try again.");
        return;
      }

      // Update local state with server response
      const updated = cinemaData.cinema || {};
      setTheaterData((prev) => ({
        ...prev,
        ...updated,
        // Keep bank fields — server doesn't return them in PUT response
        accountHolder: prev.accountHolder,
        bankName: prev.bankName,
        accountNumber: prev.accountNumber,
        ifsc: prev.ifsc,
        upiId: prev.upiId,
      }));
      setLogoFile(null);
      setBannerFile(null);

      /* ── Step 2: Save bank details ── */
      if (hasBankDetails()) {
        try {
          const bankRes = await fetch(
            `${API_BASE}/cinema/${theaterData._id}/bank-details`,
            {
              method: "POST",
              headers: jsonAuthHeaders(),
              body: JSON.stringify({
                accountHolder: theaterData.accountHolder.trim(),
                bankName: theaterData.bankName.trim(),
                accountNumber: theaterData.accountNumber.trim(),
                ifsc: theaterData.ifsc.trim().toUpperCase(),
                upiId: theaterData.upiId.trim(),
              }),
            }
          );
          const bankData = await bankRes.json();
          if (!bankRes.ok || !bankData.success) {
            console.warn("Bank details save failed:", bankData.message);
            // Non-critical — cinema was updated; soft warn only
          }
        } catch (bankErr) {
          console.warn("Bank details network error:", bankErr);
        }
      }

      setSuccess("Theater updated successfully ✅");
      setTimeout(() => navigate(-1), 1600);

    } catch (err) {
      console.error("Update error:", err);
      setError("Network error. Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading screen ── */
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

  /* ── Error / not found ── */
  if (!theaterData) {
    return (
      <div className="edit-page">
        <div className="edit-container">
          <p className="edit-msg edit-msg--error">{error || "Theater not found."}</p>
          <button className="edit-back-btn" onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    );
  }

  /* ── Main form ── */
  return (
    <div className="edit-page">
      <div className="edit-container">

        {/* HEADER */}
        <div className="edit-header">
          <button className="edit-back-btn edit-back-btn--icon" onClick={() => navigate(-1)}>←</button>
          <div>
            <h2 className="edit-title">Edit Theater</h2>
            <p className="edit-subtitle">
              {theaterData.name}{theaterData.branchName ? ` · ${theaterData.branchName}` : ""}
            </p>
          </div>
        </div>

        {success && <div className="edit-msg edit-msg--success">{success}</div>}
        {error && <div className="edit-msg edit-msg--error">{error}</div>}

        {/* ── BASIC INFORMATION ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">Basic Information</h3>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Owner Name <span className="edit-required">*</span></label>
              <input className="edit-input" name="ownerName" value={theaterData.ownerName} onChange={handleChange} placeholder="e.g. Hitesh Patel" />
            </div>
            <div className="edit-field">
              <label className="edit-label">Theater Name <span className="edit-required">*</span></label>
              <input className="edit-input" name="name" value={theaterData.name} onChange={handleChange} placeholder="e.g. PVR Cinemas" />
            </div>
          </div>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Branch Name</label>
              <input className="edit-input" name="branchName" value={theaterData.branchName} onChange={handleChange} placeholder="e.g. PVR Ahmedabad" />
            </div>
            <div className="edit-field">
              <label className="edit-label">City <span className="edit-required">*</span></label>
              <input className="edit-input" name="city" value={theaterData.city} onChange={handleChange} placeholder="e.g. Ahmedabad" />
            </div>
          </div>
          <div className="edit-field">
            <label className="edit-label">Full Address</label>
            <textarea className="edit-textarea" name="address" value={theaterData.address} onChange={handleChange} placeholder="e.g. Alpha One Mall, Vastrapur" />
          </div>
        </div>

        {/* ── CONTACT & OPERATIONS ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">Contact & Operations</h3>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Contact Number <span className="edit-required">*</span></label>
              <input className="edit-input" name="contactNumber" value={theaterData.contactNumber} onChange={handleChange} placeholder="10-digit number" maxLength={10} inputMode="numeric" />
            </div>
            <div className="edit-field">
              <label className="edit-label">Total Screens</label>
              <input className="edit-input" name="totalScreens" value={theaterData.totalScreens} onChange={handleChange} type="number" min="1" />
            </div>
          </div>
          <div className="edit-field">
            <label className="edit-label">Email Address</label>
            <input className="edit-input" name="email" type="email" value={theaterData.email} onChange={handleChange} placeholder="e.g. theater@example.com" />
          </div>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Opening Time</label>
              <input className="edit-input edit-input--time" type="time" name="openingTime" value={theaterData.openingTime} onChange={handleChange} />
            </div>
            <div className="edit-field">
              <label className="edit-label">Closing Time</label>
              <input className="edit-input edit-input--time" type="time" name="closingTime" value={theaterData.closingTime} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* ── MEDIA ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">Media Upload</h3>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Theater Logo
                <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>(optional)</span>
              </label>
              <input className="edit-input" name="theaterLogo" type="file" accept="image/*" onChange={handleFileChange} />
              {theaterData.theaterLogo && (
                <img
                  src={getImageUrl(theaterData.theaterLogo)}
                  alt="Logo preview"
                  style={{ marginTop: 8, height: 60, borderRadius: 8, objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
            </div>
            <div className="edit-field">
              <label className="edit-label">Banner Image
                <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>(optional)</span>
              </label>
              <input className="edit-input" name="banner" type="file" accept="image/*" onChange={handleFileChange} />
              {theaterData.banner && (
                <img
                  src={getImageUrl(theaterData.banner)}
                  alt="Banner preview"
                  style={{ marginTop: 8, height: 60, width: "100%", borderRadius: 8, objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── BANK DETAILS ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">
            Bank Details
            <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>(optional)</span>
          </h3>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Account Holder</label>
              <input className="edit-input" name="accountHolder" value={theaterData.accountHolder} onChange={handleChange} placeholder="Account Holder Name" />
            </div>
            <div className="edit-field">
              <label className="edit-label">Bank Name</label>
              <input className="edit-input" name="bankName" value={theaterData.bankName} onChange={handleChange} placeholder="Bank Name" />
            </div>
          </div>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Account Number</label>
              <input className="edit-input" name="accountNumber" value={theaterData.accountNumber} onChange={handleChange} placeholder="Account Number" inputMode="numeric" />
            </div>
            <div className="edit-field">
              <label className="edit-label">IFSC Code</label>
              <input
                className="edit-input"
                name="ifsc"
                value={theaterData.ifsc}
                onChange={(e) =>
                  setTheaterData((prev) => ({ ...prev, ifsc: e.target.value.toUpperCase() }))
                }
                placeholder="IFSC Code"
              />
            </div>
          </div>
          <div className="edit-field">
            <label className="edit-label">UPI ID (optional)</label>
            <input className="edit-input" name="upiId" value={theaterData.upiId} onChange={handleChange} placeholder="UPI ID" />
          </div>
        </div>

        {/* SAVE BUTTON */}
        <button className="edit-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? (
            <span className="edit-save-loading">
              <span className="edit-save-spinner" /> Saving...
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