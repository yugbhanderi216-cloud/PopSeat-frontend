import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
/* SYNC - V10 */
import "./OwnerPlan.css";

// APIs USED:
//   GET /api/subscription/my  ✅ — check if owner already has active plan
//
// ❌ MISSING API: No POST /api/owner/subscribe exists in API docs.
//   Plan selection navigates to OwnerPayment which handles:
//     POST /api/payment/create  ✅
//     POST /api/payment/verify  ✅
//   If a dedicated subscribe endpoint is added later, call it in
//   OwnerPayment after payment is verified.

const API_BASE = "https://popseat.onrender.com/api";

const getAuthToken = () => localStorage.getItem("token") || "";

// plans fetched dynamically

const OwnerPlan = () => {
  const navigate = useNavigate();
  const token = getAuthToken();
  const ownerEmail = localStorage.getItem("email") || "";

  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_BASE}/owner/plans`);
        const data = await res.json();
        if (data.success) setPlans(data.plans || []);
      } catch (err) {
        console.error("Failed to load plans", err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if (!token || role !== "owner") {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  /* ═══════════════════════════════════════
     GET /api/subscription/my ✅
     Show warning banner if owner already has
     an active plan, so they don't double-buy.
  ═══════════════════════════════════════ */
  useEffect(() => {
    if (!token) return;

    const checkSubscription = async () => {
      setSubLoading(true);
      try {
        const res = await fetch(`${API_BASE}/subscription/my`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });
        const data = await res.json();

        if (data.success) {
          const sub = data.subscription || data.plan || data.data || null;
          const isActive =
            sub?.status === "active" &&
            (!sub.expiresAt || new Date(sub.expiresAt) > new Date());

          if (isActive) setSubscription(sub);
        }
      } catch (err) {
        console.warn("Subscription check error:", err);
      } finally {
        setSubLoading(false);
      }
    };

    checkSubscription();
  }, [token]);

  /* ── Format expiry date ── */
  const formatExpiry = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
      : "";

  /* ── Select plan → navigate to payment ── */
  const selectPlan = (plan) => {
    setError("");
    setSelectedPlanId(plan._id);

    const isUpgrade = !!subscription;

    localStorage.setItem(
      "selectedPlan",
      JSON.stringify({
        id: plan._id,
        ownerEmail,
        theaters: plan.theaterLimit,
        price: plan.price,
        name: plan.name,
        isUpgrade
      })
    );

    setTimeout(() => navigate("/owner/payment"), 160);
  };

  return (
    <div className="plan-page">
      <button className="back-btn-v2" onClick={() => navigate(-1)} title="Go back">←</button>

      {/* HEADER */}
      <div className="plan-header">
        <p className="plan-header-eyebrow">PopSeat Platform</p>
        <h1 className="plan-header-title">Choose Your Theater Plan</h1>
        <p className="plan-header-sub">
          All plans include unlimited worker accounts, full analytics, and QR ordering.
        </p>
        <div className="title-line" />
      </div>

      {/* ACTIVE SUBSCRIPTION BANNER */}
      {!subLoading && subscription && (
        <div className="plan-active-banner">
          <span className="plan-active-icon">✅</span>
          <span>
            You already have an active plan ({subscription.planName || "Current"}) —{" "}
            <strong>{subscription.theatersAllowed} theater(s)</strong> allowed
            {subscription.expiresAt && (
              <>, valid until <strong>{formatExpiry(subscription.expiresAt)}</strong></>
            )}.
            Selecting a new plan will prorate your current balance and allow you to upgrade.
          </span>
        </div>
      )}

      {/* ERROR */}
      {error && <p className="plan-error">{error}</p>}

      {/* PLAN GRID */}
      <div className="plan-grid">
        {loadingPlans ? (
          <p style={{textAlign:"center", color:"#fff", width:"100%", gridColumn:"1 / -1"}}>Loading plans...</p>
        ) : plans.length === 0 ? (
          <p style={{textAlign:"center", color:"#fff", width:"100%", gridColumn:"1 / -1"}}>No plans available.</p>
        ) : plans.map((plan, index) => {
          const isFeatured = index === 2 || plan.featured;
          return (
          <div
            key={plan._id}
            className={[
              "plan-card",
              isFeatured ? "featured" : "",
              selectedPlanId === plan._id ? "selected" : "",
            ].filter(Boolean).join(" ")}
          >

            {isFeatured && (
              <div className="plan-badge">Most Popular</div>
            )}

            <h3 className="plan-name">{plan.name}</h3>

            <p className="plan-theaters">
              {plan.theaterLimit} Theater{plan.theaterLimit > 1 ? "s" : ""}
            </p>

            <div className="plan-price-row">
              <span className="plan-currency">₹</span>
              <span className="plan-price">{plan.price.toLocaleString("en-IN")}</span>
            </div>

            <p className="plan-duration">per {plan.duration || 30} days</p>

            <div className="plan-divider" />

            <ul className="plan-features">
              {plan.features?.length > 0 ? (
                plan.features.map((feat, i) => <li key={i}>{feat}</li>)
              ) : (
                <>
                  <li>Up to {plan.theaterLimit} cinema location{plan.theaterLimit > 1 ? "s" : ""}</li>
                  <li>Unlimited worker accounts</li>
                  <li>QR seat ordering</li>
                  <li>Analytics dashboard</li>
                </>
              )}
            </ul>

            <button
              className="plan-btn"
              onClick={() => selectPlan(plan)}
              disabled={selectedPlanId === plan._id || (subscription && subscription.planId === plan._id)}
            >
              {selectedPlanId === plan._id ? "Selected ✓" : (subscription && subscription.planId === plan._id ? "Current Plan" : (subscription ? "Upgrade" : "Get Started"))}
            </button>

          </div>
        )})}
      </div>

    </div>
  );
};

export default OwnerPlan;
