import React from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPayment.css";

const OwnerPayment = () => {

  const navigate = useNavigate();

  const plan = JSON.parse(localStorage.getItem("selectedPlan"));

  const handlePayment = async () => {

    if (!plan) {
      alert("No Plan Selected");
      navigate("/owner/plan");
      return;
    }

    try {

      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      let ownerPlans =
        JSON.parse(localStorage.getItem("ownerPlans")) || [];

      /* ===============================
         REMOVE EXPIRED PLANS
      =============================== */

      ownerPlans = ownerPlans.filter(
        (p) => new Date(p.expiresAt) > new Date()
      );

      /* ===============================
         CREATE NEW PLAN
      =============================== */

      const newPlan = {
        id: Date.now(),
        theatersAllowed: plan.theaters,
        remainingTheaters: plan.theaters,
        amountPaid: plan.price,
        activatedAt: now.toISOString(),
        expiresAt: expiryDate.toISOString(),
        status: "active"
      };

      ownerPlans.push(newPlan);

      localStorage.setItem("ownerPlans", JSON.stringify(ownerPlans));

      /* trigger dashboard refresh */
      window.dispatchEvent(new Event("storage"));

      alert("🎉 Payment Successful!\nPlan Activated for 30 Days");

      navigate("/owner/home");

    } catch (error) {

      console.error("Payment Error:", error);
      alert("Payment Failed");

    }

  };

  if (!plan) {
    return (
      <h2 style={{ color: "white", textAlign: "center", marginTop: "40px" }}>
        No Plan Selected
      </h2>
    );
  }

  return (

    <div className="payment-page">

      <div className="payment-card">

        <h2>Confirm Your Plan</h2>

        <p>You selected</p>

        <h3>{plan.theaters} Theater Plan</h3>

        <h1>₹{plan.price}</h1>

        <p className="plan-note">
          Valid for 30 days from activation
        </p>

        <button onClick={handlePayment}>
          Pay Now
        </button>

      </div>

    </div>

  );

};

export default OwnerPayment;