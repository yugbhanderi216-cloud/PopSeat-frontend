import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./TheaterRegister.css";

const capitalizeSmart = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
};

const TheaterRegister = () => {
  const navigate = useNavigate();
  const ownerEmail = localStorage.getItem("loggedInUser");

  const [loading, setLoading] = useState(true);

  const [theaterData, setTheaterData] = useState({
    ownerEmail,
    ownerName: "",
    theaterName: "",
    branch: "",
    city: "",
    address: "",
    screens: "",
    contact: "",
    openingTime: "",
    closingTime: "",
    logo: "",
    banner: "",

    /* BANK DETAILS */
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    upiId: "",
  });

  /* ================= PLAN CHECK ================= */

  useEffect(() => {
    let ownerPlans = JSON.parse(localStorage.getItem("ownerPlans")) || [];
    const now = new Date();

    ownerPlans = ownerPlans.filter(
      (p) => p.ownerEmail === ownerEmail && new Date(p.expiresAt) > now
    );

    localStorage.setItem("ownerPlans", JSON.stringify(ownerPlans));

    if (!ownerPlans.length) {
      alert("Please purchase a plan first.");
      navigate("/owner/plan");
    } else {
      setLoading(false);
    }
  }, [navigate, ownerEmail]);

  if (loading) return null;

  /* ================= INPUT CHANGE ================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    const capitalFields = [
      "ownerName",
      "theaterName",
      "branch",
      "city",
      "address",
      "accountHolder",
      "bankName",
    ];

    let newValue = value;

    if (capitalFields.includes(name)) {
      newValue = capitalizeSmart(value);
    }

    setTheaterData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  /* ================= IMAGE UPLOAD ================= */

  const handleImage = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files allowed");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTheaterData((prev) => ({
        ...prev,
        [type]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = () => {
    const {
      ownerName,
      theaterName,
      branch,
      city,
      address,
      screens,
      accountHolder,
      bankName,
      accountNumber,
      ifsc,
    } = theaterData;

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

    let ownerPlans = JSON.parse(localStorage.getItem("ownerPlans")) || [];
    const now = new Date();

    ownerPlans = ownerPlans.filter(
      (p) => p.ownerEmail === ownerEmail && new Date(p.expiresAt) > now
    );

    ownerPlans.sort(
      (a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)
    );

    const usablePlan = ownerPlans.find((p) => p.remainingTheaters > 0);

    if (!usablePlan) {
      alert("Your plan limit is reached.");
      navigate("/owner/plan");
      return;
    }

    let theaters = JSON.parse(localStorage.getItem("theaters")) || [];

    const newTheater = {
      id: Date.now(),
      ...theaterData,
      totalScreens: Number(theaterData.screens),
      planId: usablePlan.id,
      createdAt: new Date().toISOString(),
      status: "Active",
    };

    theaters.push(newTheater);

    localStorage.setItem("theaters", JSON.stringify(theaters));

    usablePlan.remainingTheaters -= 1;
    localStorage.setItem("ownerPlans", JSON.stringify(ownerPlans));

    window.dispatchEvent(new Event("storage"));

    alert("Theater Registered Successfully 🎬");

    navigate("/owner/home");
  };

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

        <input value={theaterData.ownerEmail} readOnly />

        <input
          name="ownerName"
          placeholder="Owner Name"
          value={theaterData.ownerName}
          onChange={handleChange}
        />

        <input
          name="theaterName"
          placeholder="Theater Name"
          value={theaterData.theaterName}
          onChange={handleChange}
        />

        <input
          name="branch"
          placeholder="Branch Name"
          value={theaterData.branch}
          onChange={handleChange}
        />

        <input
          name="city"
          placeholder="City"
          value={theaterData.city}
          onChange={handleChange}
        />

        <textarea
          name="address"
          placeholder="Full Address"
          value={theaterData.address}
          onChange={handleChange}
        />

        <input
          name="screens"
          type="number"
          placeholder="Total Screens"
          value={theaterData.screens}
          onChange={handleChange}
        />

        <input
          name="contact"
          placeholder="Contact"
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

        <label>Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImage(e, "logo")}
        />

        <label>Banner</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImage(e, "banner")}
        />

        {/* ================= BANK DETAILS ================= */}

        <h3>Bank Details</h3>

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
        />

        <input
          name="ifsc"
          placeholder="IFSC Code"
          value={theaterData.ifsc}
          onChange={handleChange}
        />

        <input
          name="upiId"
          placeholder="UPI ID (Optional)"
          value={theaterData.upiId}
          onChange={handleChange}
        />

        <button onClick={handleSubmit}>
          Register Theater
        </button>

      </div>
    </div>
  );
};

export default TheaterRegister;