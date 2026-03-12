import React from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPayment.css";

const OwnerPayment = () => {

  const navigate = useNavigate();
  const plan = JSON.parse(localStorage.getItem("selectedPlan"));

  const handlePayment = () => {

    if (!plan) {
      alert("No Plan Selected");
      navigate("/owner/plan");
      return;
    }

    const now = new Date();

    // ✅ 30 DAYS EXPIRY
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    let ownerPlans = JSON.parse(localStorage.getItem("ownerPlans")) || [];

    const newPlan = {
      id: Date.now(),
      theatersAllowed: plan.theaters,
      remainingTheaters: plan.theaters,
      amountPaid: plan.price,
      activatedAt: now.toISOString(),
      expiresAt: expiryDate.toISOString()
    };

    ownerPlans.push(newPlan);

    localStorage.setItem("ownerPlans", JSON.stringify(ownerPlans));

    // sync across dashboard
    window.dispatchEvent(new Event("storage"));

    alert("Payment Successful 🎉 Plan Activated for 30 Days");

    navigate("/owner/home");
  };

  if (!plan) {
    return <h2 style={{color:"white"}}>No Plan Selected</h2>;
  }

  return (
    <div className="payment-page">
      <div className="payment-card">
        <h2>Confirm Your Plan</h2>
        <p>You selected</p>
        <h3>{plan.theaters} Theater Plan</h3>
        <h1>₹{plan.price}</h1>
        <button onClick={handlePayment}>
          Pay Now
        </button>
      </div>
    </div>
  );
};

export default OwnerPayment;