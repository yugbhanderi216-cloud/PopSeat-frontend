import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TheaterRegister.css";

const API_BASE = "https://popseat.onrender.com";

const capitalizeSmart = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

const TheaterRegister = () => {
  const navigate = useNavigate();
  const ownerEmail = localStorage.getItem("email");

  const [loading, setLoading] = useState(false);

  const [theaterData, setTheaterData] = useState({
    ownerName: "",
    theaterName: "",   // → sent as "name" to API
    branch: "",        // → sent as "branchName" to API
    city: "",
    address: "",
    screens: "",       // → sent as "totalScreens" (Number) to API
    contact: "",       // → sent as "contactNumber" to API
    openingTime: "",
    closingTime: "",
    theaterLogo: "",   // URL string — no upload API available
    banner: "",        // URL string — no upload API available

    /* BANK DETAILS — no API endpoint yet, stored locally */
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  });

  /* ── input change ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    const capitalFields = [
      "ownerName", "theaterName", "branch",
      "city", "address", "accountHolder", "bankName",
    ];
    setTheaterData((prev) => ({
      ...prev,
      [name]: capitalFields.includes(name) ? capitalizeSmart(value) : value,
    }));
  };

  /* ── submit → POST /api/cinema ── */
  const handleSubmit = async () => {
    const {
      ownerName, theaterName, branch, city, address,
      screens, contact, openingTime, closingTime,
      theaterLogo, banner,
      accountHolder, bankName, accountNumber, ifsc,
    } = theaterData;

    // ── validation ──
    if (!ownerName || !theaterName || !branch || !city || !address) {
      alert("Please fill all required fields.");
      return;
    }
    if (!screens || Number(screens) < 1) {
      alert("At least 1 screen required.");
      return;
    }
    if (!accountHolder || !bankName || !accountNumber || !ifsc) {
      alert("Please fill bank details.");
      return;
    }

    // ── map fields to API schema ──
    const payload = {
      name: theaterName,           // API expects "name"
      branchName: branch,          // API expects "branchName"
      ownerName,
      email: ownerEmail,           // API expects "email"
      contactNumber: contact,      // API expects "contactNumber"
      city,
      address,
      openingTime,
      closingTime,
      totalScreens: Number(screens), // API expects "totalScreens" as number
      theaterLogo: theaterLogo || "https://popseat.onrender.com/default-logo.png",
      banner: banner || "https://popseat.onrender.com/default-banner.jpg",
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cinema`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Failed to register theater. Please try again.");
        return;
      }

      // ── save bank details locally (no API for this yet) ──
      const bankDetails = JSON.parse(localStorage.getItem("bankDetails") || "{}");
      bankDetails[data.cinema._id] = {
        accountHolder,
        bankName,
        accountNumber,
        ifsc,
        upiId: theaterData.upiId,
      };
      localStorage.setItem("bankDetails", JSON.stringify(bankDetails));

      alert("Theater Registered Successfully 🎬");
      navigate("/owner/home");

    } catch (err) {
      console.error("Register error:", err);
      alert("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  /* ── UI ── */
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
        <input value={ownerEmail || ""} readOnly />

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
          placeholder="Contact Number"
          value={theaterData.contact}
          onChange={handleChange}
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

        {/*
          ⚠️ NO IMAGE UPLOAD API IN BACKEND DOCS.
          Using URL inputs instead of file upload.
          Ask backend dev to add: POST /api/upload → returns image URL
        */}
        <label>Theater Logo URL</label>
        <input
          name="theaterLogo"
          placeholder="https://... (logo image URL)"
          value={theaterData.theaterLogo}
          onChange={handleChange}
        />

        <label>Banner URL</label>
        <input
          name="banner"
          placeholder="https://... (banner image URL)"
          value={theaterData.banner}
          onChange={handleChange}
        />

        {/* ── BANK DETAILS ── */}
        {/*
          ⚠️ NO BANK DETAILS API IN BACKEND DOCS.
          Saved locally until backend adds: POST /api/cinema/:id/bank-details
        */}
        <h3>Bank Details</h3>
        <p className="api-note">⚠️ Bank details saved locally — backend API pending</p>

        <input
          name="accountHolder"
          placeholder="Account Holder Name *"
          value={theaterData.accountHolder}
          onChange={handleChange}
        />

        <input
          name="bankName"
          placeholder="Bank Name *"
          value={theaterData.bankName}
          onChange={handleChange}
        />

        <input
          name="accountNumber"
          placeholder="Account Number *"
          value={theaterData.accountNumber}
          onChange={handleChange}
        />

        <input
          name="ifsc"
          placeholder="IFSC Code *"
          value={theaterData.ifsc}
          onChange={handleChange}
        />

        <input
          name="upiId"
          placeholder="UPI ID (Optional)"
          value={theaterData.upiId}
          onChange={handleChange}
        />

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Registering..." : "Register Theater"}
        </button>

      </div>
    </div>
  );
};

export default TheaterRegister;