import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./RenewPlan.css";

const RenewPlan = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const planId = location.state?.planId;

  const handleSelectPlan = (months) => {

    let plans = JSON.parse(localStorage.getItem("ownerPlans")) || [];

    const updatedPlans = plans.map(p => {
      if (p.id === planId) {

        const today = new Date();
        const currentExpiry = new Date(p.expiresAt);

        // If expired → start from today
        // If active → extend from existing expiry
        const baseDate = currentExpiry > today ? currentExpiry : today;

        const newExpiry = new Date(baseDate);
        newExpiry.setMonth(newExpiry.getMonth() + months);

        return {
          ...p,
          expiresAt: newExpiry.toISOString()
        };
      }
      return p;
    });

    localStorage.setItem("ownerPlans", JSON.stringify(updatedPlans));
    window.dispatchEvent(new Event("storage"));

    alert("Plan Purchased Successfully ✅");

    // 🔥 Correct navigation
    navigate("/owner/home");
  };

  return (
  <div className="renew-container">
    <div className="plan-cover">
    <h1>Choose Your Plan</h1>
    </div>
    

    <div className="plan-row">

      <div className="plan-card">
        <h2>1 Month</h2>
        <p>₹500</p>
        <button onClick={() => handleSelectPlan(1)}>Buy Now</button>
      </div>

      <div className="plan-card">
        <h2>6 Months</h2>
        <p>₹2800</p>
        <button onClick={() => handleSelectPlan(6)}>Buy Now</button>
      </div>

      <div className="plan-card">
        <h2>1 Year</h2>
        <p>₹5500</p>
        <button onClick={() => handleSelectPlan(12)}>Buy Now</button>
      </div>

    </div>

  </div>
);
};

export default RenewPlan;