import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./TheaterRegister.css";

// ─────────────────────────────────────────────────────────────
// APIs USED:
//   POST /api/cinema                    ✅ — register theater (multipart/form-data)
//   GET  /api/subscription/my           ✅ — gate registration by plan
//   POST /api/cinema/:id/bank-details   ✅ — save bank details (owner auth)
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://popseat.onrender.com";

const capitalizeSmart = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
};

const getAuthToken = () =>
  localStorage.getItem("ownerToken") ||
  localStorage.getItem("token") ||
  "";

// JSON auth headers (for subscription check & bank details)
const jsonAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

// Auth-only headers (no Content-Type — used for FormData so browser sets boundary)
const formAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
});

const CAPITALIZE_FIELDS = [
  "ownerName", "theaterName", "branch",
  "city", "address", "accountHolder", "bankName",
];

const TheaterRegister = () => {
  const navigate = useNavigate();

  const ownerEmail =
    localStorage.getItem("ownerEmail") ||
    localStorage.getItem("email") ||
    "";

  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [subBlocked, setSubBlocked] = useState(false);

  const [theaterData, setTheaterData] = useState({
    ownerName: "",
    theaterName: "",
    branch: "",
    city: "",
    address: "",
    screens: "",
    contact: "",
    openingTime: "",
    closingTime: "",
    theaterLogo: null, // File object or null
    banner: null, // File object or null
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  });

  /* ── Auth guard ── */
  useEffect(() => {
    if (!ownerEmail) navigate("/login", { replace: true });
  }, [ownerEmail, navigate]);

  /* ── Check Subscription: GET /api/subscription/my ── */
  useEffect(() => {
    const checkSub = async () => {
      setSubLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/subscription/my`, {
          headers: jsonAuthHeaders(),
        });

        // If 401/403 — not logged in properly
        if (res.status === 401 || res.status === 403) {
          setSubBlocked(true);
          return;
        }

        const data = await res.json();

        if (data.success) {
          // Handle various response shapes: { subscription }, { plan }, { data }
          const sub =
            data.subscription ||
            data.plan ||
            (Array.isArray(data.data) ? data.data[0] : data.data) ||
            null;

          if (!sub) {
            // API succeeded but no subscription found → block
            setSubBlocked(true);
            return;
          }

          // Check expiry
          const expiryDate =
            sub.expiryDate || sub.expiresAt || sub.expiry || null;
          const expired = expiryDate
            ? new Date(expiryDate) <= new Date()
            : false;

          // Check status
          const inactive =
            sub.status && sub.status.toLowerCase() !== "active";

          if (expired || inactive) {
            setSubBlocked(true);
          }
          // else: active subscription → allow
        } else {
          // API returned success: false — block registration
          setSubBlocked(true);
        }
      } catch (err) {
        console.error("Subscription check failed:", err);
        setSubBlocked(true);
        // Network error → let through; server will guard POST /api/cinema
      } finally {
        setSubLoading(false);
      }
    };

    checkSub();
  }, []);

  /* ── Input change ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldError("");
    setError("");
    setTheaterData((prev) => ({ ...prev, [name]: value }));
  };

  /* ── Capitalize on blur (not on keystroke, so cursor doesn't jump) ── */
  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (CAPITALIZE_FIELDS.includes(name)) {
      setTheaterData((prev) => ({
        ...prev,
        [name]: capitalizeSmart(value),
      }));
    }
  };

  /* ── File input ── */
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setTheaterData((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  /* ── Validation ── */
  const validate = () => {
    const { ownerName, theaterName, branch, city, address, screens, contact } =
      theaterData;

    if (!ownerName?.trim()) return "Owner name is required.";
    if (!theaterName?.trim()) return "Theater name is required.";
    if (!branch?.trim()) return "Branch name is required.";
    if (!city?.trim()) return "City is required.";
    if (!address?.trim()) return "Address is required.";

    if (!screens || Number(screens) < 1)
      return "At least 1 screen is required.";

    if (contact && !/^\d{10}$/.test(contact.trim()))
      return "Contact number must be exactly 10 digits.";

    return null;
  };

  /* ── Has any bank field been filled? ── */
  const hasBankDetails = () => {
    const { accountHolder, bankName, accountNumber, ifsc } = theaterData;
    return accountHolder || bankName || accountNumber || ifsc;
  };

  /* ═══════════════════════════════════════════════════════════
     SUBMIT
     Step 1: POST /api/cinema  (multipart/form-data)
     Step 2: POST /api/cinema/:id/bank-details  (JSON, if filled)
  ═══════════════════════════════════════════════════════════ */
  const handleSubmit = async () => {
    setError("");
    setFieldError("");

    if (!ownerEmail) {
      setError("You must be logged in to register a theater.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    const {
      ownerName, theaterName, branch, city, address,
      screens, contact, openingTime, closingTime,
      theaterLogo, banner,
      accountHolder, bankName, accountNumber, ifsc, upiId,
    } = theaterData;

    setLoading(true);

    try {
      /* ── STEP 1: Register cinema with FormData (Multer on backend) ── */
      const formData = new FormData();
      formData.append("name", theaterName.trim());
      formData.append("branchName", branch.trim());
      formData.append("ownerName", ownerName.trim());
      formData.append("email", ownerEmail.trim());
      formData.append("contactNumber", contact.trim() || "");
      formData.append("city", city.trim());
      formData.append("address", address.trim());
      formData.append("openingTime", openingTime || "09:00");
      formData.append("closingTime", closingTime || "23:00");
      formData.append("totalScreens", String(Number(screens)));

      // Always send text fallback values for banner & theaterLogo in the body.
      // Backend does: cinemaData = { ...req.body }  then overwrites with req.files if present.
      // Mongoose model has these as required — empty string "" still fails required check,
      // but a real URL string passes it. If a file is selected, Multer overwrites the value.
      const DEFAULT_LOGO = "https://popseat.onrender.com/defaults/logo.png";
      const DEFAULT_BANNER = "https://popseat.onrender.com/defaults/banner.jpg";
      if (theaterLogo instanceof File) {
        formData.append("theaterLogo", theaterLogo);
      } else {
        formData.append("theaterLogo", DEFAULT_LOGO);
      }

      if (banner instanceof File) {
        formData.append("banner", banner);
      } else {
        formData.append("banner", DEFAULT_BANNER);
      }
      const cinemaRes = await fetch(`${API_BASE}/api/cinema`, {
        method: "POST",
        headers: formAuthHeaders(), // ← NO Content-Type; browser sets multipart boundary
        body: formData,
      });

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
        setError(
          cinemaData.message || "Failed to register theater. Please try again."
        );
        return;
      }

      const cinemaId = cinemaData.cinema?._id;

      // ✅ Backend now auto-creates halls and returns them in response
      // cinemaData.halls = [{ _id, name, screenNumber, hallNumber, ... }]
      // No need to create halls manually — they are already created.
      if (cinemaData.halls?.length > 0) {
        console.log(`✅ ${cinemaData.halls.length} halls auto-created by backend.`);
      }

      /* ── STEP 2: Save bank details — POST /api/cinema/:id/bank-details ── */
      if (cinemaId && hasBankDetails()) {
        try {
          const bankRes = await fetch(
            `${API_BASE}/api/cinema/${cinemaId}/bank-details`,
            {
              method: "POST",
              headers: jsonAuthHeaders(),
              body: JSON.stringify({
                accountHolder: accountHolder.trim(),
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                ifsc: ifsc.trim().toUpperCase(),
                upiId: upiId.trim(),
              }),
            }
          );

          const bankData = await bankRes.json();

          if (!bankRes.ok || !bankData.success) {
            // Non-critical: cinema registered. Just warn.
            console.warn("Bank details save failed:", bankData.message);
            // Optionally show a soft warning but still navigate
          }
        } catch (bankErr) {
          // Non-critical — cinema already created
          console.warn("Bank details network error:", bankErr);
        }
      }

      // ✅ Success — navigate to owner home
      navigate("/owner/home");

    } catch (err) {
      console.error("Register error:", err);
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Network error. Please check your internet connection.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Subscription loading screen ── */
  if (subLoading) {
    return (
      <div className="theater-page">
        <div className="theater-card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#888" }}>Checking subscription...</p>
        </div>
      </div>
    );
  }

  /* ── No active plan — block registration ── */
  if (subBlocked) {
    return (
      <div className="theater-page">
        <button type="button" className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <div className="theater-card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h3>Active Plan Required</h3>
          <p style={{ color: "#888", margin: "12px 0 20px" }}>
            You need an active subscription plan to register a theater.
          </p>
          <button onClick={() => navigate("/owner/plan")}>View Plans</button>
        </div>
      </div>
    );
  }

  /* ── Main Form ── */
  return (
    <div className="theater-page">
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        ←
      </button>

      <div className="theater-card">
        <h2>Register Theater</h2>

        {/* Owner email — read-only */}
        <input
          value={ownerEmail}
          readOnly
          style={{ color: "#888", background: "#f5f5f5", cursor: "default" }}
        />

        {/* Validation error */}
        {fieldError && (
          <p className="error-box field-error">{fieldError}</p>
        )}

        {/* API / network error */}
        {error && (
          <p className="error-box api-error">{error}</p>
        )}

        {/* ── Theater Info ── */}
        <input
          name="ownerName"
          placeholder="Owner Name *"
          value={theaterData.ownerName}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <input
          name="theaterName"
          placeholder="Theater Name *"
          value={theaterData.theaterName}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <input
          name="branch"
          placeholder="Branch Name *"
          value={theaterData.branch}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <input
          name="city"
          placeholder="City *"
          value={theaterData.city}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <textarea
          name="address"
          placeholder="Full Address *"
          value={theaterData.address}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <input
          name="screens"
          type="number"
          min="1"
          placeholder="Total Screens *"
          value={theaterData.screens}
          onChange={handleChange}
        />

        <input
          name="contact"
          placeholder="Contact Number (10 digits)"
          value={theaterData.contact}
          onChange={handleChange}
          maxLength={10}
          inputMode="numeric"
        />

        <label>Opening Time</label>
        <input
          name="openingTime"
          type="time"
          value={theaterData.openingTime}
          onChange={handleChange}
        />

        <label>Closing Time</label>
        <input
          name="closingTime"
          type="time"
          value={theaterData.closingTime}
          onChange={handleChange}
        />

        <label>
          Theater Logo
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>(optional)</span>
        </label>
        <input
          name="theaterLogo"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        <label>
          Banner Image
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>(optional)</span>
        </label>
        <input
          name="banner"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        {/* ── Bank Details ── */}
        <h3 style={{ marginTop: 20 }}>Bank Details
          <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>
            (optional)
          </span>
        </h3>

        <input
          name="accountHolder"
          placeholder="Account Holder Name"
          value={theaterData.accountHolder}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <input
          name="bankName"
          placeholder="Bank Name"
          value={theaterData.bankName}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <input
          name="accountNumber"
          placeholder="Account Number"
          value={theaterData.accountNumber}
          onChange={handleChange}
          inputMode="numeric"
        />

        <input
          name="ifsc"
          placeholder="IFSC Code"
          value={theaterData.ifsc}
          onChange={(e) =>
            setTheaterData((prev) => ({
              ...prev,
              ifsc: e.target.value.toUpperCase(),
            }))
          }
        />

        <input
          name="upiId"
          placeholder="UPI ID (optional)"
          value={theaterData.upiId}
          onChange={handleChange}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1, marginTop: 16 }}
        >
          {loading ? "Registering..." : "Register Theater 🎬"}
        </button>
      </div>
    </div>
  );
};

export default TheaterRegister;