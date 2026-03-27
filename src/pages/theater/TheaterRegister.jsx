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

  const ownerEmail =
    localStorage.getItem("ownerEmail") ||
    localStorage.getItem("email")      || "";

  const [loading,      setLoading]      = useState(false);
  const [subLoading,   setSubLoading]   = useState(true);
  const [error,        setError]        = useState("");
  const [fieldError,   setFieldError]   = useState("");
  const [subBlocked,   setSubBlocked]   = useState(false); // only block if CONFIRMED inactive

  const [theaterData, setTheaterData] = useState({
    ownerName     : "",
    theaterName   : "",
    branch        : "",
    city          : "",
    address       : "",
    screens       : "",
    contact       : "",
    openingTime   : "",
    closingTime   : "",
    theaterLogo   : "",
    banner        : "",
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
     FIX: Only block if API explicitly confirms no active plan.
          Network errors, unexpected shapes → let through.
          Server will reject POST /api/cinema if truly unsubscribed.
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

          // Only hard-block if we got a sub object AND it is explicitly inactive/expired
          if (sub) {
            const expired = sub.expiresAt && new Date(sub.expiresAt) <= new Date();
            const inactive = sub.status && sub.status !== "active";
            if (expired && inactive) {
              setSubBlocked(true);
            }
            // If shape is unclear → don't block (server guards the POST)
          }
          // If sub is null but API succeeded → plan not purchased yet → block
          else if (data.success && !sub) {
            setSubBlocked(true);
          }
        }
        // If !data.success or network error → don't block
      } catch (err) {
        console.warn("Subscription check failed, allowing through:", err);
        // Don't block — server-side will protect POST /api/cinema
      } finally {
        setSubLoading(false);
      }
    };

    checkSub();
  }, []);

  /* ── Input change ──
     FIX: capitalize only on blur, not on every keystroke,
          so cursor never jumps mid-word while typing.
  ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldError("");
    setError("");
    setTheaterData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (CAPITALIZE_FIELDS.includes(name)) {
      setTheaterData((prev) => ({
        ...prev,
        [name]: capitalizeSmart(value),
      }));
    }
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

  /* ── Validation ── */
  const validate = () => {
    const {
      ownerName, theaterName, branch, city,
      address, screens, contact,
    } = theaterData;

    if (!ownerName?.trim())   return "Owner name is required.";
    if (!theaterName?.trim()) return "Theater name is required.";
    if (!branch?.trim())      return "Branch name is required.";
    if (!city?.trim())        return "City is required.";
    if (!address?.trim())     return "Address is required.";

    if (!screens || Number(screens) < 1) {
      return "At least 1 screen is required.";
    }

    if (contact && !/^\d{10}$/.test(contact.trim())) {
      return "Contact number must be exactly 10 digits.";
    }

    return null;
  };

  /* ===============================
     SUBMIT — POST /api/cinema ✅
  =============================== */
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

      // Save bank details locally — no backend endpoint yet
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
          // Non-critical
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
  if (subBlocked) {
    return (
      <div className="theater-page">
        <button type="button" className="back-btn" onClick={() => navigate(-1)}>←</button>
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
        <input
          value={ownerEmail}
          readOnly
          style={{ color: "#888", background: "#f5f5f5" }}
        />

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
          Theater Logo File
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>(optional)</span>
        </label>
        <input
          name="theaterLogo"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        <label>
          Banner File
          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 6 }}>(optional)</span>
        </label>
        <input
          name="banner"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        {/* ── BANK DETAILS ── */}
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