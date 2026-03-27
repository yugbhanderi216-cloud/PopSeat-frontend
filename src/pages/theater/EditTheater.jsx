import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./EditTheater.css";

// APIs USED:
//   GET /api/cinema/:id   ✅
//   PUT /api/cinema/:id   ✅

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

const CAPITALIZE_FIELDS = ["ownerName", "name", "branchName", "city", "address", "accountHolder", "bankName"];
const REQUIRED_FIELDS   = ["name", "ownerName", "city", "contactNumber"];

const EditTheater = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params    = new URLSearchParams(location.search);
  const theaterId =
    params.get("theaterId")   ||
    location.state?.theaterId || 
    localStorage.getItem("activeOwnerTheaterId") || "";

  const [theaterData, setTheaterData] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

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
          const loadedCinema = data.cinema;
          
          // Load bank details saved locally
          let localBank = {};
          try {
            const bankDetails = JSON.parse(localStorage.getItem("bankDetails") || "{}");
            if (bankDetails[theaterId]) {
              localBank = bankDetails[theaterId];
            }
          } catch (e) {}

          setTheaterData({
            ...loadedCinema,
            accountHolder: localBank.accountHolder || "",
            bankName: localBank.bankName || "",
            accountNumber: localBank.accountNumber || "",
            ifsc: localBank.ifsc || "",
            upiId: localBank.upiId || "",
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

  const handleChange = (e) => {
    const { name, value } = e.target;
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
  
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTheaterData((prev) => ({ ...prev, [name]: reader.result }));
      };
      reader.readAsDataURL(files[0]);
    }
  };

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

  const handleSave = async () => {
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    try {
      const payload = {
        name         : theaterData.name,
        branchName   : theaterData.branchName,
        ownerName    : theaterData.ownerName,
        city         : theaterData.city,
        address      : theaterData.address,
        contactNumber: theaterData.contactNumber,
        totalScreens : Number(theaterData.totalScreens),
        openingTime  : theaterData.openingTime,
        closingTime  : theaterData.closingTime,
        email        : theaterData.email?.trim() || "",
        banner       : theaterData.banner       || "",
        theaterLogo  : theaterData.theaterLogo  || "",
      };

      const res  = await fetch(`${API_BASE}/cinema/${theaterData._id}`, {
        method : "PUT",
        headers: authHeaders(),
        body   : JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        // Handle bank details save locally since there's no backend
        const { accountHolder, bankName, accountNumber, ifsc, upiId } = theaterData;
        if (accountHolder || bankName || accountNumber || ifsc) {
          try {
            const bankDetails = JSON.parse(localStorage.getItem("bankDetails") || "{}");
            bankDetails[theaterData._id] = { accountHolder, bankName, accountNumber, ifsc, upiId };
            localStorage.setItem("bankDetails", JSON.stringify(bankDetails));
          } catch (e) {}
        }
        
        setTheaterData((prev) => ({ ...prev, ...data.cinema }));
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
        {error   && <div className="edit-msg edit-msg--error">{error}</div>}

        {/* ── BASIC INFORMATION ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">Basic Information</h3>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Owner Name <span className="edit-required">*</span></label>
              <input className="edit-input" name="ownerName" value={theaterData.ownerName || ""} onChange={handleChange} placeholder="e.g. Hitesh Patel" />
            </div>
            <div className="edit-field">
              <label className="edit-label">Theater Name <span className="edit-required">*</span></label>
              <input className="edit-input" name="name" value={theaterData.name || ""} onChange={handleChange} placeholder="e.g. PVR Cinemas" />
            </div>
          </div>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Branch Name</label>
              <input className="edit-input" name="branchName" value={theaterData.branchName || ""} onChange={handleChange} placeholder="e.g. PVR Ahmedabad" />
            </div>
            <div className="edit-field">
              <label className="edit-label">City <span className="edit-required">*</span></label>
              <input className="edit-input" name="city" value={theaterData.city || ""} onChange={handleChange} placeholder="e.g. Ahmedabad" />
            </div>
          </div>
          <div className="edit-field">
            <label className="edit-label">Full Address</label>
            <textarea className="edit-textarea" name="address" value={theaterData.address || ""} onChange={handleChange} placeholder="e.g. Alpha One Mall, Vastrapur" />
          </div>
        </div>

        {/* ── CONTACT & OPERATIONS ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">Contact & Operations</h3>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Contact Number <span className="edit-required">*</span></label>
              <input className="edit-input" name="contactNumber" value={theaterData.contactNumber || ""} onChange={handleChange} placeholder="10-digit number" maxLength={10} />
            </div>
            <div className="edit-field">
              <label className="edit-label">Total Screens</label>
              <input className="edit-input" name="totalScreens" value={theaterData.totalScreens || ""} onChange={handleChange} type="number" min="1" />
            </div>
          </div>
          <div className="edit-field">
            <label className="edit-label">Email Address</label>
            <input className="edit-input" name="email" type="email" value={theaterData.email || ""} onChange={handleChange} placeholder="e.g. theater@example.com" />
          </div>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Opening Time</label>
              <input className="edit-input edit-input--time" type="time" name="openingTime" value={theaterData.openingTime || ""} onChange={handleChange} />
            </div>
            <div className="edit-field">
              <label className="edit-label">Closing Time</label>
              <input className="edit-input edit-input--time" type="time" name="closingTime" value={theaterData.closingTime || ""} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* ── MEDIA ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">Media Upload</h3>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Theater Logo File</label>
              <input className="edit-input" name="theaterLogo" type="file" accept="image/*" onChange={handleFileChange} />
              {theaterData.theaterLogo && (
                <img src={theaterData.theaterLogo} alt="Logo" style={{ marginTop: 8, height: 60, borderRadius: 8, objectFit: 'cover' }} onError={(e) => { e.target.style.display = "none"; }} />
              )}
            </div>
            <div className="edit-field">
              <label className="edit-label">Banner File</label>
              <input className="edit-input" name="banner" type="file" accept="image/*" onChange={handleFileChange} />
              {theaterData.banner && (
                <img src={theaterData.banner} alt="Banner" style={{ marginTop: 8, height: 60, width: '100%', borderRadius: 8, objectFit: 'cover' }} onError={(e) => { e.target.style.display = "none"; }} />
              )}
            </div>
          </div>
        </div>

        {/* ── BANK DETAILS ── */}
        <div className="edit-section">
          <h3 className="edit-section-title">
            Bank Details
            <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>
              (optional — saved locally)
            </span>
          </h3>
          <p style={{ fontSize: 12, color: "#f57f17", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 6, padding: "6px 10px", margin: "0 0 10px" }}>
            ⚠️ Bank details are saved locally only.
          </p>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Account Holder</label>
              <input className="edit-input" name="accountHolder" value={theaterData.accountHolder || ""} onChange={handleChange} placeholder="Account Holder Name" />
            </div>
            <div className="edit-field">
              <label className="edit-label">Bank Name</label>
              <input className="edit-input" name="bankName" value={theaterData.bankName || ""} onChange={handleChange} placeholder="Bank Name" />
            </div>
          </div>
          <div className="edit-field-row">
            <div className="edit-field">
              <label className="edit-label">Account Number</label>
              <input className="edit-input" name="accountNumber" value={theaterData.accountNumber || ""} onChange={handleChange} placeholder="Account Number" />
            </div>
            <div className="edit-field">
              <label className="edit-label">IFSC Code</label>
              <input className="edit-input" name="ifsc" value={theaterData.ifsc || ""} onChange={(e) => setTheaterData((prev) => ({ ...prev, ifsc: e.target.value.toUpperCase() }))} placeholder="IFSC Code" />
            </div>
          </div>
          <div className="edit-field">
            <label className="edit-label">UPI ID (optional)</label>
            <input className="edit-input" name="upiId" value={theaterData.upiId || ""} onChange={handleChange} placeholder="UPI ID" />
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