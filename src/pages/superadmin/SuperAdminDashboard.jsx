import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SuperAdminDashboard.css";
import logo from "../PopSeat_Logo.png";

/* FORMAT TIME */

const formatTime = (time) => {
  if (!time) return "";
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

/* COMPONENT */

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [theaters, setTheaters] = useState([]);
  const [search, setSearch] = useState("");

  /* LOAD THEATERS */

  const loadTheaters = () => {
    let stored = JSON.parse(localStorage.getItem("theaters")) || [];
    if (!Array.isArray(stored)) { stored = Object.values(stored); }
    const normalized = stored.map(t => ({ ...t, adminStatus: t.adminStatus || "Pending", status: t.adminStatus || "Pending" }));
    setTheaters(normalized);
  };

  /* AUTH CHECK */

  useEffect(() => {
    const checkAuthAndLoad = () => {
      const role = localStorage.getItem("role");
      if (role !== "superadmin") { navigate("/"); return; }
      loadTheaters();
    };
    checkAuthAndLoad();
    window.addEventListener("focus", checkAuthAndLoad);
    window.addEventListener("storage", checkAuthAndLoad);
    window.addEventListener("localDataUpdated", checkAuthAndLoad);
    return () => {
      window.removeEventListener("focus", checkAuthAndLoad);
      window.removeEventListener("storage", checkAuthAndLoad);
      window.removeEventListener("localDataUpdated", checkAuthAndLoad);
    };
  }, [navigate]);

  /* UPDATE STATUS */

  const updateStatus = (id, newStatus) => {
    let stored = JSON.parse(localStorage.getItem("theaters")) || [];
    if (!Array.isArray(stored)) { stored = Object.values(stored); }
    const updated = stored.map(t => t.id === id ? { ...t, adminStatus: newStatus, status: newStatus } : t);
    localStorage.setItem("theaters", JSON.stringify(updated));
    window.dispatchEvent(new Event("localDataUpdated"));
    loadTheaters();
  };

  /* LOGOUT */

  const logout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("loggedInUser");
    window.location.href = "/superadmin-login";
  };

  /* SEARCH */

  const filtered = theaters.filter(t => t.theaterName?.toLowerCase().includes(search.toLowerCase()) || t.ownerName?.toLowerCase().includes(search.toLowerCase()));

  /* UI */

  return (
    <div className="admin-dashboard">
      {/* HEADER */}
      <div className="top-header">
        <div className="brand">
          <img src={logo} alt="PopSeat Logo" className="brand-logo" />
          <h1 className="brand-title">PopSeat</h1>
        </div>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
      {/* CONTROL PANEL */}
      <div className="control-panel">
        <div className="stats-box">
          <span>Total Registered</span>
          <h2>{theaters.length}</h2>
        </div>
        <div className="dashboard-title">Super Admin Dashboard</div>
        <div className="search-box">
          <input placeholder="Search theater or owner" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      {/* GRID */}
      <div className="grid">
        {filtered.map(t => (
          <div key={t.id} className="card">
            <h3>{t.theaterName}</h3>
            <p><b>Owner:</b>{t.ownerName}</p>
            <p><b>Email:</b>{t.ownerEmail}</p>
            <p><b>Branch:</b>{t.branch}</p>
            <p><b>City:</b>{t.city}</p>
            <p><b>Address:</b>{t.address}</p>
            <p><b>Screens:</b>{t.screens}</p>
            <p><b>Opening:</b>{formatTime(t.openingTime)}</p>
            <p><b>Closing:</b>{formatTime(t.closingTime)}</p>
            {/* BANK DETAILS */}
            <hr />
            <h4>Bank Details</h4>
            <p><b>Account Holder:</b>{t.accountHolder}</p>
            <p><b>Bank Name:</b>{t.bankName}</p>
            <p><b>Account Number:</b>{t.accountNumber}</p>
            <p><b>IFSC:</b>{t.ifsc}</p>
            {t.upiId && <p><b>UPI:</b>{t.upiId}</p>}
            {/* STATUS */}
            <div className={`status ${t.status}`}>{t.status}</div>
            {/* ACTIONS */}
            <div className="actions">
              {t.adminStatus === "Pending" && <button onClick={() => updateStatus(t.id, "Active")}>Approve</button>}
              {t.adminStatus === "Active" && <button onClick={() => updateStatus(t.id, "Disabled")}>Disable</button>}
              {t.adminStatus === "Disabled" && <button onClick={() => updateStatus(t.id, "Active")}>Re-Enable</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SuperAdminDashboard;