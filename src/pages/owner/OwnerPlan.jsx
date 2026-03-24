import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const getOwnerToken = () =>
  localStorage.getItem("ownerToken") || localStorage.getItem("token") || "";

// Plan definitions
// price is in ₹, theaters is the allowed count
// id is stored in localStorage → read by OwnerPayment
const PLANS = [
  { id: "basic",      label: "Basic",      theaters: 1, price: 800  },
  { id: "standard",   label: "Standard",   theaters: 2, price: 1300 },
  { id: "pro",        label: "Pro",        theaters: 3, price: 2000, featured: true },
  { id: "enterprise", label: "Enterprise", theaters: 4, price: 2500 },
];

const OwnerPlan = () => {
  const navigate   = useNavigate();
  const token      = getOwnerToken();
  const ownerEmail = localStorage.getItem("ownerEmail") || localStorage.getItem("email") || "";

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [subscription,   setSubscription]   = useState(null);
  const [subLoading,     setSubLoading]     = useState(true);
  const [error,          setError]          = useState("");

  // FIX 5: Only guard on token + role, not email.
  // Some login flows don't store ownerEmail and the owner
  // would be incorrectly bounced back to /login.
  useEffect(() => {
    const role = (
      localStorage.getItem("ownerRole") || localStorage.getItem("role") || ""
    ).toLowerCase();
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
        const res  = await fetch(`${API_BASE}/subscription/my`, {
          headers: {
            "Content-Type": "application/json",
            Authorization : `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (data.success) {
          const sub = data.subscription || data.plan || data.data || null;
          // FIX 1 & 3: Safe null check for expiresAt.
          // Before: new Date(undefined) = Invalid Date → always false,
          // so valid active subs with no expiry were silently ignored.
          const isActive =
            sub?.status === "active" &&
            (!sub.expiresAt || new Date(sub.expiresAt) > new Date());

          if (isActive) setSubscription(sub);
        }
      } catch (err) {
        // Non-critical — just hide the banner
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
    setSelectedPlanId(plan.id);

    // Save full plan for OwnerPayment to read
    localStorage.setItem(
      "selectedPlan",
      JSON.stringify({
        id      : plan.id,
        ownerEmail,
        theaters: plan.theaters,
        price   : plan.price,
        label   : plan.label,
      })
    );

    // Small delay so user sees card highlight before navigating
    setTimeout(() => navigate("/owner/payment"), 160);
  };

  return (
    <div className="plan-page">

      {/* HEADER */}
      <div className="plan-header">
        <p className="plan-header-eyebrow">PopSeat Platform</p>
        <h1 className="plan-header-title">Choose Your Theater Plan</h1>
        <p className="plan-header-sub">
          All plans include unlimited worker accounts, full analytics, and QR ordering.
        </p>
        <div className="title-line" />
      </div>

      {/* ACTIVE SUBSCRIPTION BANNER — FIX 6: no more inline styles */}
      {!subLoading && subscription && (
        <div className="plan-active-banner">
          <span className="plan-active-icon">✅</span>
          <span>
            You already have an active plan —{" "}
            <strong>{subscription.theatersAllowed} theater(s)</strong> allowed
            {subscription.expiresAt && (
              <>, valid until <strong>{formatExpiry(subscription.expiresAt)}</strong></>
            )}.
            Purchasing a new plan will replace your current one.
          </span>
        </div>
      )}

      {/* ERROR */}
      {error && <p className="plan-error">{error}</p>}

      {/* PLAN GRID
          FIX 4: Changed from broken 3-col grid with enterprise centering
          to clean 4-col grid. Featured card uses CSS scale only — no
          grid-column tricks that break when plan count changes. */}
      <div className="plan-grid">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={[
              "plan-card",
              plan.featured              ? "featured"  : "",
              selectedPlanId === plan.id ? "selected"  : "",
            ].filter(Boolean).join(" ")}
          >

            {/* Featured badge */}
            {plan.featured && (
              <div className="plan-badge">Most Popular</div>
            )}

            {/* Plan name */}
            <h3 className="plan-name">{plan.label}</h3>

            {/* Theater count */}
            <p className="plan-theaters">
              {plan.theaters} Theater{plan.theaters > 1 ? "s" : ""}
            </p>

            {/* Price */}
            <div className="plan-price-row">
              <span className="plan-currency">₹</span>
              <span className="plan-price">{plan.price.toLocaleString("en-IN")}</span>
            </div>

            <p className="plan-duration">per 30 days</p>

            {/* Divider */}
            <div className="plan-divider" />

            {/* Feature bullets */}
            <ul className="plan-features">
              <li>Up to {plan.theaters} cinema location{plan.theaters > 1 ? "s" : ""}</li>
              <li>Unlimited worker accounts</li>
              <li>QR seat ordering</li>
              <li>Analytics dashboard</li>
            </ul>

            {/* CTA */}
            <button
              className="plan-btn"
              onClick={() => selectPlan(plan)}
              disabled={selectedPlanId === plan.id}
            >
              {selectedPlanId === plan.id ? "Selected ✓" : "Get Started"}
            </button>

          </div>
        ))}
      </div>

    </div>
  );
};

export default OwnerPlan;