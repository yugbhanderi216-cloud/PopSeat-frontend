import React from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPlan.css";

const OwnerPlan = () => {

  const navigate = useNavigate();

  const selectPlan = (plan) => {

    const ownerEmail = localStorage.getItem("loggedInUser");

    let ownerPlans = JSON.parse(localStorage.getItem("ownerPlans")) || [];

    const newPlan = {
      id: Date.now(),
      ownerEmail,
      totalTheaters: plan.theaters,
      remainingTheaters: plan.theaters,
      price: plan.price,
      purchasedAt: new Date().toISOString(),
      expiresAt: new Date(
        new Date().setMonth(new Date().getMonth() + 1)
      ).toISOString()
    };

    ownerPlans.push(newPlan);

    localStorage.setItem("ownerPlans", JSON.stringify(ownerPlans));

    alert("Plan Activated Successfully 🎉");

    navigate("/owner/home");
  };

  return (
    <div className="plan-page">

      {/* HEADER */}
      <div className="plan-header">
        <h1>Choose Your Theater Plan</h1>
        <div className="title-line"></div>
      </div>

      {/* PLAN GRID */}
      <div className="plan-grid">

        <div className="plan-card">
          <h3>Basic Plan</h3>
          <p>Register 1 Theater</p>
          <h2>Rs.800</h2>
          <button onClick={() => selectPlan({ theaters: 1, price: 800 })}>
            Select Plan
          </button>
        </div>

        <div className="plan-card">
          <h3>Standard Plan</h3>
          <p>Register 2 Theaters</p>
          <h2>Rs.1300</h2>
          <button onClick={() => selectPlan({ theaters: 2, price: 1300 })}>
            Select Plan
          </button>
        </div>

        <div className="plan-card featured">
          <h3>Pro Plan</h3>
          <p>Register 3 Theaters</p>
          <h2>Rs.2000</h2>
          <button onClick={() => selectPlan({ theaters: 3, price: 2000 })}>
            Select Plan
          </button>
        </div>

        <div className="plan-card enterprise">
          <h3>Enterprise Plan</h3>
          <p>Register 4 Theaters</p>
          <h2>Rs.2500</h2>
          <button onClick={() => selectPlan({ theaters: 4, price: 2500 })}>
            Select Plan
          </button>
        </div>

      </div>

    </div>
  );
};

export default OwnerPlan;