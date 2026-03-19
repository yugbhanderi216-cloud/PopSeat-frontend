import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./RenewPlan.css";

const RenewPlan = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const planId = location.state?.planId;

  /* ===============================
     RENEW PLAN
  =============================== */

  const handleSelectPlan = (months, price) => {

    if (!planId) {
      alert("Invalid plan. Please try again.");
      navigate("/owner/home");
      return;
    }

    let plans =
      JSON.parse(localStorage.getItem("ownerPlans")) || [];

    const planExists = plans.find(p => p.id === planId);

    if (!planExists) {
      alert("Plan not found");
      navigate("/owner/home");
      return;
    }

    const updatedPlans = plans.map(p => {

      if (p.id === planId) {

        const today = new Date();
        const currentExpiry = new Date(p.expiresAt);

        /* If expired → start today
           If active → extend from expiry */
        const baseDate =
          currentExpiry > today ? currentExpiry : today;

        const newExpiry = new Date(baseDate);
        newExpiry.setMonth(newExpiry.getMonth() + months);

        return {
          ...p,
          expiresAt: newExpiry.toISOString(),
          lastRenewedAt: today.toISOString(),
          lastAmountPaid: price
        };
      }

      return p;

    });

    localStorage.setItem(
      "ownerPlans",
      JSON.stringify(updatedPlans)
    );

    /* refresh dashboard */
    window.dispatchEvent(new Event("storage"));

    alert("Plan Renewed Successfully ✅");

    navigate("/owner/home");

  };

  return (

    <div className="renew-container">

      <div className="plan-cover">
        <h1>Choose Renewal Plan</h1>
      </div>

      <div className="plan-row">

        <div className="plan-card">

          <h2>1 Month</h2>

          <p>₹500</p>

          <button
            onClick={() => handleSelectPlan(1, 500)}
          >
            Buy Now
          </button>

        </div>

        <div className="plan-card">

          <h2>6 Months</h2>

          <p>₹2800</p>

          <button
            onClick={() => handleSelectPlan(6, 2800)}
          >
            Buy Now
          </button>

        </div>

        <div className="plan-card">

          <h2>1 Year</h2>

          <p>₹5500</p>

          <button
            onClick={() => handleSelectPlan(12, 5500)}
          >
            Buy Now
          </button>

        </div>

      </div>

    </div>

  );

};

export default RenewPlan;