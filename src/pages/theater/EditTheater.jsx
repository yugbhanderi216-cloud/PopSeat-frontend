import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EditTheater.css";

/* SMART AUTO CAPITALIZE */
const capitalizeSmart = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
};

const EditTheater = () => {

  const navigate = useNavigate();
  const [theaterData, setTheaterData] = useState(null);

  useEffect(() => {

    const role = localStorage.getItem("role");

    if (role === "BRANCH") {
      navigate("/theater/overview");
      return;
    }

    let theaters = JSON.parse(localStorage.getItem("theaters")) || [];

    if (!Array.isArray(theaters)) {
      theaters = Object.values(theaters);
      localStorage.setItem("theaters", JSON.stringify(theaters));
    }

    const activeOwnerId = Number(localStorage.getItem("activeOwnerTheaterId"));

    const selectedTheater = theaters.find(
      (t) => t.id === activeOwnerId
    );

    if (selectedTheater) {
      setTheaterData(selectedTheater);
    }

  }, []);

  const role = localStorage.getItem("role");

  if (role === "BRANCH") return null;

  if (!theaterData) {
    return <h2 style={{ padding: "20px" }}>No Theater Found</h2>;
  }

  /* HANDLE CHANGE */

  const handleChange = (e) => {
    const { name, value } = e.target;

    const capitalFields = [
      "ownerName",
      "theaterName",
      "branch",
      "city",
      "address",
      "accountHolder",
      "bankName"
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

  /* IMAGE UPLOAD */

  const handleImage = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setTheaterData((prev) => ({
        ...prev,
        [type]: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  /* SAVE */

  const handleSave = () => {

    let theaters = JSON.parse(localStorage.getItem("theaters")) || [];

    if (!Array.isArray(theaters)) {
      theaters = Object.values(theaters);
    }

    const updatedTheaters = theaters.map((t) =>
      t.id === theaterData.id
        ? {
            ...theaterData,
            updatedAt: new Date().toLocaleString(),
          }
        : t
    );

    localStorage.setItem("theaters", JSON.stringify(updatedTheaters));

    window.dispatchEvent(new Event("storage"));

    alert("Theater Updated Successfully ✅");

    navigate(-1);
  };

  return (
    <div className="edit-container">

      <h2>Edit Theater</h2>

      <input
        name="ownerName"
        value={theaterData.ownerName}
        onChange={handleChange}
        placeholder="Owner Name"
      />

      <input
        name="theaterName"
        value={theaterData.theaterName}
        onChange={handleChange}
        placeholder="Theater Name"
      />

      <input
        name="branch"
        value={theaterData.branch}
        onChange={handleChange}
        placeholder="Branch"
      />

      <input
        name="city"
        value={theaterData.city || ""}
        onChange={handleChange}
        placeholder="City"
      />

      <textarea
        name="address"
        value={theaterData.address || ""}
        onChange={handleChange}
        placeholder="Full Address"
      />

      <input
        name="contact"
        value={theaterData.contact}
        onChange={handleChange}
        placeholder="Contact"
      />

      <input
        name="screens"
        value={theaterData.screens}
        onChange={handleChange}
        placeholder="Screens"
      />

      <label>Opening Time</label>
      <input
        type="time"
        name="openingTime"
        value={theaterData.openingTime || ""}
        onChange={handleChange}
      />

      <label>Closing Time</label>
      <input
        type="time"
        name="closingTime"
        value={theaterData.closingTime || ""}
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
        value={theaterData.accountHolder || ""}
        onChange={handleChange}
        placeholder="Account Holder Name"
      />

      <input
        name="bankName"
        value={theaterData.bankName || ""}
        onChange={handleChange}
        placeholder="Bank Name"
      />

      <input
        name="accountNumber"
        value={theaterData.accountNumber || ""}
        onChange={handleChange}
        placeholder="Account Number"
      />

      <input
        name="ifsc"
        value={theaterData.ifsc || ""}
        onChange={handleChange}
        placeholder="IFSC Code"
      />

      <input
        name="upiId"
        value={theaterData.upiId || ""}
        onChange={handleChange}
        placeholder="UPI ID"
      />

      <button onClick={handleSave}>
        Save Changes
      </button>

    </div>
  );
};

export default EditTheater;