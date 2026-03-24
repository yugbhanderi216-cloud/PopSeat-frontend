import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./TheaterRegister.css";

// ─────────────────────────────────────────────────────────────
// APIs USED:
//   POST /api/cinema               ✅ — register theater
//   GET  /api/subscription/my      ✅ — gate registration by plan
//
// MISSING APIs (for backend team):
//   POST /api/upload               ❌ — image upload → URL
//   POST /api/cinema/:id/bank-details ❌ — save bank details server-side
// ─────────────────────────────────────────────────────────────

const API_BASE = "https://popseat.onrender.com";

const capitalizeSmart = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
};

// FIX: triple-key fallback — matches OwnerHome / TheaterDashboard
const authHeaders = () => ({
  "Content-Type" : "application/json",
  Authorization  : `Bearer ${
    localStorage.getItem("ownerToken") ||
    localStorage.getItem("token")      || ""
  }`,
});

const CAPITALIZE_FIELDS = [
  "ownerName", "theaterName", "branch",
  "city", "address", "accountHolder", "bankName",
];

const TheaterRegister = () => {

  const navigate = useNavigate();

  // FIX: dual-key read for ownerEmail
  const ownerEmail =
    localStorage.getItem("ownerEmail") ||
    localStorage.getItem("email")      || "";

  const [loading,    setLoading]    = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  const [error,      setError]      = useState("");
  const [fieldError, setFieldError] = useState(""); // inline field validation
  const [subscription, setSubscription] = useState(null);

  const [theaterData, setTheaterData] = useState({
    ownerName   : "",
    theaterName : "",  // → "name" in API
    branch      : "",  // → "branchName" in API
    city        : "",
    address     : "",
    screens     : "",  // → "totalScreens" (Number)
    contact     : "",  // → "contactNumber"
    openingTime : "",
    closingTime : "",
    theaterLogo : "",  // URL — no upload API yet
    banner      : "",  // URL — no upload API yet
    // Bank details — local only until backend adds endpoint
    accountHolder : "",
    bankName      : "",
    accountNumber : "",
    ifsc          : "",
    upiId         : "",
  });

  /* ── Auth guard ── */

  useEffect(() => {
    if (!ownerEmail) navigate("/login", { replace: true });
  }, [ownerEmail, navigate]);

  /* ===============================
     CHECK SUBSCRIPTION — GET /api/subscription/my ✅
     FIX: user could bypass OwnerHome plan gate by
          navigating directly to /theater-register
  =============================== */

  useEffect(() => {

    const checkSub = async () => {

      setSubLoading(true);

      try {

        const res  = await fetch(`${API_BASE}/api/subscription/my`, {
          headers: authHeaders(),
        });
        const data = await res.json();

        if (data.success) {
          const sub = data.subscription || data.plan || data.data || null;
          setSubscription(sub);
        }

      } catch (err) {
        console.warn("Subscription check error:", err);
        // Allow registration attempt even if check fails —
        // server will reject if no active plan
      } finally {
        setSubLoading(false);
      }

    };

    checkSub();

  }, []);

  /* ── Subscription gate ── */

  const isSubActive =
    subscription?.status === "active" &&
    new Date(subscription?.expiresAt) > new Date();

  /* ── Input change ── */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldError("");
    setError("");
    setTheaterData((prev) => ({
      ...prev,
      [name]: CAPITALIZE_FIELDS.includes(name)
        ? capitalizeSmart(value)
        : value,
    }));
  };

  /* ── Validation ── */

  const validate = () => {

    const {
      ownerName, theaterName, branch, city,
      address, screens, contact,
    } = theaterData;

    if (!ownerName?.trim())    return "Owner name is required.";
    if (!theaterName?.trim())  return "Theater name is required.";
    if (!branch?.trim())       return "Branch name is required.";
    if (!city?.trim())         return "City is required.";
    if (!address?.trim())      return "Address is required.";

    if (!screens || Number(screens) < 1) {
      return "At least 1 screen is required.";
    }

    // FIX: contact validation (same as EditTheater)
    if (contact && !/^\d{10}$/.test(contact.trim())) {
      return "Contact number must be exactly 10 digits.";
    }

    // FIX: bank details now optional — removed hard validation block
    // Owner can fill these later; no backend endpoint exists yet anyway

    return null;

  };

  /* ===============================
     SUBMIT — POST /api/cinema ✅
  =============================== */

  const handleSubmit = async () => {

    setError("");
    setFieldError("");

    // FIX: guard against missing owner email before sending
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

    // Map local field names → API field names (documented in state init)
    const payload = {
      name          : theaterName,
      branchName    : branch,
      ownerName,
      email         : ownerEmail,
      contactNumber : contact || "",
      city,
      address,
      openingTime   : openingTime || "09:00",
      closingTime   : closingTime || "23:00",
      totalScreens  : Number(screens),
      theaterLogo   : theaterLogo || "https://popseat.onrender.com/default-logo.png",
      banner        : banner      || "https://popseat.onrender.com/default-banner.jpg",
    };

    setLoading(true);

    try {

      const res  = await fetch(`${API_BASE}/api/cinema`, {
        method  : "POST",
        headers : authHeaders(),
        body    : JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Failed to register theater. Please try again.");
        return;
      }

      // Save bank details locally against cinema _id
      // ⚠️  No backend endpoint yet — local only
      if (accountHolder || bankName || accountNumber || ifsc) {
        try {
          const bankDetails = JSON.parse(
            localStorage.getItem("bankDetails") || "{}"
          );
          bankDetails[data.cinema._id] = {
            accountHolder, bankName, accountNumber, ifsc, upiId,
          };
          localStorage.setItem("bankDetails", JSON.stringify(bankDetails));
        } catch {
          // Non-critical — don't block success flow
        }
      }

      navigate("/owner/home");

    } catch (err) {
      console.error("Register error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }

  };

  /* ── Subscription loading ── */

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

  if (!isSubActive) {
    return (
      <div className="theater-page">
        <button type="button" className="back-btn" onClick={() => navigate(-1)}>←</button>
        <div className="theater-card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h3>Active Plan Required</h3>
          <p style={{ color: "#888", margin: "12px 0 20px" }}>
            You need an active subscription plan to register a theater.
          </p>
          <button onClick={() => navigate("/owner/plan")}>
            View Plans
          </button>
        </div>
      </div>
    );
  }

  /* ── Render ── */

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

        {/* Owner email — read only */}
        <input value={ownerEmail} readOnly style={{ color: "#888", background: "#f5f5f5" }} />

        {/* FIELD ERROR */}
        {fieldError && (
          <p style={{
            color: "#e55", background: "#fff3f3", border: "1px solid #fbb",
            borderRadius: 8, padding: "8px 12px", fontSize: 13, margin: "4px 0",
          }}>
            {fieldError}
          </p>
        )}

        {/* API ERROR */}
        {error && (
          <p style={{
            color: "#c00", background: "#fff3f3", border: "1px solid #fbb",
            borderRadius: 8, padding: "8px 12px", fontSize: 13, margin: "4px 0",
          }}>
            {error}
          </p>
        )}

        <input
          name="ownerName"
          placeholder="Owner Name *"
          value={theaterData.ownerName}
          onChange={handleChange}
        />

        <input
          name="theaterName"
          placeholder="Theater Name *"
          value={theaterData.theaterName}
          onChange={handleChange}
        />

        <input
          name="branch"
          placeholder="Branch Name *"
          value={theaterData.branch}
          onChange={handleChange}
        />

        <input
          name="city"
          placeholder="City *"
          value={theaterData.city}
          onChange={handleChange}
        />

        <textarea
          name="address"
          placeholder="Full Address *"
          value={theaterData.address}
          onChange={handleChange}
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

        {/* ⚠️ NO IMAGE UPLOAD API — URL inputs only */}
        <label>
          Theater Logo URL
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>
            (optional)
          </span>
        </label>
        <input
          name="theaterLogo"
          placeholder="https://... (logo image URL)"
          value={theaterData.theaterLogo}
          onChange={handleChange}
        />

        <label>
          Banner URL
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>
            (optional)
          </span>
        </label>
        <input
          name="banner"
          placeholder="https://... (banner image URL)"
          value={theaterData.banner}
          onChange={handleChange}
        />

        {/* ── BANK DETAILS ──
            FIX: made optional — no backend API exists yet
                 owner not blocked from registering theater
                 without bank details
        ── */}
        <h3 style={{ marginTop: 20 }}>
          Bank Details
          <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400, marginLeft: 8 }}>
            (optional — saved locally until backend adds this API)
          </span>
        </h3>

        <p style={{
          fontSize: 12, color: "#f57f17", background: "#fff8e1",
          border: "1px solid #ffe082", borderRadius: 6,
          padding: "6px 10px", margin: "0 0 10px",
        }}>
          ⚠️ Bank details are saved locally only.
          Backend needs: <code>POST /api/cinema/:id/bank-details</code>
        </p>

        <input
          name="accountHolder"
          placeholder="Account Holder Name"
          value={theaterData.accountHolder}
          onChange={handleChange}
        />

        <input
          name="bankName"
          placeholder="Bank Name"
          value={theaterData.bankName}
          onChange={handleChange}
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