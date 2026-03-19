import React from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPlan.css";

const OwnerPlan = () => {

  const navigate = useNavigate();

  const selectPlan = (plan) => {

    const ownerEmail = localStorage.getItem("loggedInUser");

    if (!ownerEmail) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    // Save selected plan temporarily
    const selectedPlan = {
      ownerEmail,
      theaters: plan.theaters,
      price: plan.price
    };

    localStorage.setItem(
      "selectedPlan",
      JSON.stringify(selectedPlan)
    );

    // Go to payment page
    navigate("/owner/payment");

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

        {/* BASIC */}
        <div className="plan-card">

          <h3>Basic Plan</h3>

          <p>Register 1 Theater</p>

          <h2>Rs.800</h2>

          <button
            onClick={() =>
              selectPlan({ theaters: 1, price: 800 })
            }
          >
            Select Plan
          </button>

        </div>

        {/* STANDARD */}
        <div className="plan-card">

          <h3>Standard Plan</h3>

          <p>Register 2 Theaters</p>

          <h2>Rs.1300</h2>

          <button
            onClick={() =>
              selectPlan({ theaters: 2, price: 1300 })
            }
          >
            Select Plan
          </button>

        </div>

        {/* PRO */}
        <div className="plan-card featured">

          <h3>Pro Plan</h3>

          <p>Register 3 Theaters</p>

          <h2>Rs.2000</h2>

          <button
            onClick={() =>
              selectPlan({ theaters: 3, price: 2000 })
            }
          >
            Select Plan
          </button>

        </div>

        {/* ENTERPRISE */}
        <div className="plan-card enterprise">

          <h3>Enterprise Plan</h3>

          <p>Register 4 Theaters</p>

          <h2>Rs.2500</h2>

          <button
            onClick={() =>
              selectPlan({ theaters: 4, price: 2500 })
            }
          >
            Select Plan
          </button>

        </div>

      </div>

    </div>

  );

};

export default OwnerPlan;