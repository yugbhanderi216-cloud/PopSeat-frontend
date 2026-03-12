import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerHome.css";
import logo from "../PopSeat_Logo.png";
const formatTime = (time) => {
  if (!time) return "";
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};
const getDaysLeft = (expiryDate) => {
  const today = new Date();
  const exp = new Date(expiryDate);
  const diff = exp - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
const OwnerHome = () => {
  const navigate = useNavigate();
  const ownerEmail = localStorage.getItem("loggedInUser");
  const role = localStorage.getItem("role");
  const [theaters, setTheaters] = useState([]);
  const [branchLogins, setBranchLogins] = useState({});
  const [workersMap, setWorkersMap] = useState({});
  const [workerInputs, setWorkerInputs] = useState({});
  const [ownerPlans, setOwnerPlans] = useState([]);
  useEffect(() => {
    if (role !== "OWNER") navigate("/login");
  }, [role, navigate]);
  const loadOwnerData = () => {
    let storedTheaters = JSON.parse(localStorage.getItem("theaters")) || [];
    let plans = JSON.parse(localStorage.getItem("ownerPlans")) || [];
    if (!Array.isArray(storedTheaters)) {
      storedTheaters = Object.values(storedTheaters);
    }
    setOwnerPlans(plans);
    const myTheaters = storedTheaters.filter((t) => t.ownerEmail === ownerEmail);
    setTheaters(myTheaters);
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const branchMap = {};
    users.filter((u) => u.role === "BRANCH").forEach((u) => {
      branchMap[u.theaterId] = { email: u.email, password: u.password };
    });
    setBranchLogins(branchMap);
    const workers = JSON.parse(localStorage.getItem("workers")) || [];
    const wmap = {};
    workers.forEach((w) => {
      if (!wmap[w.theaterId]) wmap[w.theaterId] = [];
      wmap[w.theaterId].push(w);
    });
    setWorkersMap(wmap);
  };
  useEffect(() => {
    const checkAuthAndLoad = () => {
      if (role !== "OWNER") {
        navigate("/login");
        return;
      }
      loadOwnerData();
    };
    checkAuthAndLoad();
    window.addEventListener("focus", checkAuthAndLoad);
    window.addEventListener("storage", checkAuthAndLoad);
    return () => {
      window.removeEventListener("focus", checkAuthAndLoad);
      window.removeEventListener("storage", checkAuthAndLoad);
    };
  }, [ownerEmail, role, navigate]);
  const handleSaveBranchLogin = (theaterId, email, password) => {
    if (!email || !password) return alert("Enter email & password");
    let users = JSON.parse(localStorage.getItem("users")) || [];
    users = users.filter((u) => !(u.role === "BRANCH" && u.theaterId === theaterId));
    users.push({ id: Date.now(), email: email.trim().toLowerCase(), password: password.trim(), role: "BRANCH", theaterId });
    localStorage.setItem("users", JSON.stringify(users));
    window.dispatchEvent(new Event("storage"));
    alert("Branch Login Saved ✅");
  };
  const handleAddWorker = (theaterId) => {
    const name = workerInputs[theaterId]?.trim();
    if (!name) { alert("Enter worker name"); return; }
    const workers = JSON.parse(localStorage.getItem("workers")) || [];
    workers.push({ id: Date.now(), theaterId, name });
    localStorage.setItem("workers", JSON.stringify(workers));
    setWorkerInputs(prev => ({ ...prev, [theaterId]: "" }));
    window.dispatchEvent(new Event("storage"));
  };
  const handleDeleteWorker = (workerId) => {
    let workers = JSON.parse(localStorage.getItem("workers")) || [];
    workers = workers.filter((w) => w.id !== workerId);
    localStorage.setItem("workers", JSON.stringify(workers));
    window.dispatchEvent(new Event("storage"));
  };
  const handleDeleteTheater = (theaterId) => {
    if (!window.confirm("Delete this theater?")) return;
    let storedTheaters = JSON.parse(localStorage.getItem("theaters")) || [];
    storedTheaters = storedTheaters.filter((t) => t.id !== theaterId);
    localStorage.setItem("theaters", JSON.stringify(storedTheaters));
    let workers = JSON.parse(localStorage.getItem("workers")) || [];
    workers = workers.filter((w) => w.theaterId !== theaterId);
    localStorage.setItem("workers", JSON.stringify(workers));
    let users = JSON.parse(localStorage.getItem("users")) || [];
    users = users.filter((u) => !(u.role === "BRANCH" && u.theaterId === theaterId));
    localStorage.setItem("users", JSON.stringify(users));
    window.dispatchEvent(new Event("storage"));
  };
  const handleRenewPlan = (planId) => {
    let plans = JSON.parse(localStorage.getItem("ownerPlans")) || [];
    const updatedPlans = plans.map(p => {
      if (p.id === planId) {
        const today = new Date();
        const newExpiry = new Date(today);
        newExpiry.setDate(today.getDate() + 30);
        return { ...p, expiresAt: newExpiry.toISOString() };
      }
      return p;
    });
    localStorage.setItem("ownerPlans", JSON.stringify(updatedPlans));
    window.dispatchEvent(new Event("storage"));
    alert("Plan Renewed Successfully ✅");
  };
  const openDashboard = (theaterId) => {
    let stored = JSON.parse(localStorage.getItem("theaters")) || [];
    if (!Array.isArray(stored)) stored = Object.values(stored);
    const theater = stored.find(t => t.id === theaterId);
    const plan = ownerPlans.find(p => p.id === theater.planId);
    const daysLeft = plan?.expiresAt ? getDaysLeft(plan.expiresAt) : -1;
    if (theater.adminStatus !== "Active") { alert("Waiting for Super Admin Approval ⏳"); return; }
    if (daysLeft < 1) { alert("Plan expired. Please renew."); return; }
    navigate("/theater/overview", { state: { theaterId } });
  };
  return (
    <div className="owner-container">
      <div className="owner-header">
        <h1>🎬 Owner Control Panel</h1>
        <div className="brand">
          <img src={logo} alt="PopSeat Logo" />
          <h1>PopSeat</h1>
        </div>
        <button onClick={() => navigate("/theater-register")}>+ Add New Theater</button>
      </div>
      <div className="theater-grid">
        {theaters.map((t) => {
          const branch = branchLogins[t.id] || {};
          const workers = workersMap[t.id] || [];
          const plan = ownerPlans.find(p => p.id === t.planId);
          const daysLeft = plan ? getDaysLeft(plan.expiresAt) : null;
          return (
            <div key={t.id} className="theater-card">
              <h2>{t.theaterName}</h2>
              <p><strong>Branch:</strong> {t.branch}</p>
              <p>{t.location}</p>
              <p>Screens: {t.screens}</p>
              <p>Hours: {formatTime(t.openingTime)} – {formatTime(t.closingTime)}</p>
              <p className={`status ${t.adminStatus}`}>Status: {t.adminStatus || "Pending"}</p>
              {plan && (
                <>
                  <p>Plan Expiry: {new Date(plan.expiresAt).toLocaleDateString()}</p>
                  {daysLeft <= 0 ? (
                    <>
                      <p className="expired-plan">Plan Expired ❌</p>
                      <button className="renew-btn" onClick={() => navigate("/renew-plan", { state: { planId: plan.id } })}>Renew Plan</button>
                    </>
                  ) : (
                    <p className="active-plan">Plan Active ✅</p>
                  )}
                </>
              )}
              <div className="theater-actions">
                <button onClick={() => openDashboard(t.id)}>Open Dashboard</button>
                <button className="delete-theater-btn" onClick={() => handleDeleteTheater(t.id)}>Delete Theater</button>
              </div>
              <div className="staff-manage-box">
                <h4>Branch Login</h4>
                <input defaultValue={branch.email} id={`bemail-${t.id}`} placeholder="Email" />
                <input defaultValue={branch.password} id={`bpass-${t.id}`} placeholder="Password" />
                <button onClick={() => handleSaveBranchLogin(t.id, document.getElementById(`bemail-${t.id}`).value, document.getElementById(`bpass-${t.id}`).value)}>Save Branch Login</button>
                <h4>Workers</h4>
                <input placeholder="Worker Name" value={workerInputs[t.id] || ""} onChange={(e) => setWorkerInputs({ ...workerInputs, [t.id]: e.target.value })} />
                <button onClick={() => handleAddWorker(t.id)}>Add Worker</button>
                <div className="staff-list-mini">
                  {workers.map((w) => (
                    <div key={w.id} className="worker-row">
                      <span>{w.name}</span>
                      <button className="delete-worker-btn" onClick={() => handleDeleteWorker(w.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default OwnerHome;