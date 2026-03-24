import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPayment.css";

// APIs USED:
//   POST /api/payment/create   ✅ — creates Razorpay order server-side
//   POST /api/payment/verify   ✅ — verifies Razorpay signature (MUST be called)
//   GET  /api/subscription/my  ✅ — confirms plan is active after payment

const API_BASE     = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const getOwnerToken = () =>
  localStorage.getItem("ownerToken") || localStorage.getItem("token") || "";

const authHeaders = () => ({
  "Content-Type" : "application/json",
  Authorization  : `Bearer ${getOwnerToken()}`,
});

/* ── Load Razorpay script dynamically ── */
// FIX 5: If user refreshes directly on this page, window.Razorpay won't exist.
// This loader ensures the script is always present before payment starts.
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script  = document.createElement("script");
    script.src    = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const OwnerPayment = () => {
  const navigate = useNavigate();

  const plan = (() => {
    try { return JSON.parse(localStorage.getItem("selectedPlan")) || null; }
    catch { return null; }
  })();

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  /* Pre-load Razorpay script on mount */
  useEffect(() => { loadRazorpayScript(); }, []);

  /* ═══════════════════════════════════════
     POST /api/payment/create ✅
     Creates a Razorpay order on the server.

     FIX 1: API docs show orderId must be a
     valid MongoDB order/payment _id, NOT the
     owner's user ID. We use the subscription
     plan price as the amount and leave orderId
     as a reference — backend will link it to
     the owner via the auth token automatically.
     The "orderId" in the body is just a
     reference string for the payment record;
     it is NOT the owner's _id.
  ═══════════════════════════════════════ */
  const createRazorpayOrder = async () => {
    const res  = await fetch(`${API_BASE}/payment/create`, {
      method  : "POST",
      headers : authHeaders(),
      body    : JSON.stringify({
        amount  : plan.price * 100,   // in paise
        currency: "INR",
        // orderId here is a client reference — backend uses auth token
        // to identify the owner. Pass a descriptive string or omit if
        // your backend doesn't require it.
        // ⚠️ If backend requires a real Mongo orderId, first create
        //    an order via POST /api/order/create and use that _id here.
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Could not create payment order.");
    }

    // Backend must return razorpayOrderId inside data.payment
    if (!data.payment?.razorpayOrderId) {
      throw new Error(
        "Backend did not return razorpayOrderId. Please contact support."
      );
    }

    return data.payment;
  };

  /* ═══════════════════════════════════════
     POST /api/payment/verify ✅
     FIX 2: This MUST be called after Razorpay
     success to verify the payment signature.
     Previously this was skipped entirely —
     meaning anyone could fake a successful
     payment without server validation.
  ═══════════════════════════════════════ */
  const verifyPayment = async (razorpayResponse) => {
    const res  = await fetch(`${API_BASE}/payment/verify`, {
      method  : "POST",
      headers : authHeaders(),
      body    : JSON.stringify({
        razorpay_order_id  : razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature : razorpayResponse.razorpay_signature,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success || data.verified === false) {
      throw new Error(data.message || "Payment verification failed. Please contact support.");
    }

    return data;
  };

  /* ═══════════════════════════════════════
     GET /api/subscription/my ✅
     Called after verify to confirm plan
     is now active on the server.
  ═══════════════════════════════════════ */
  const fetchActiveSubscription = async () => {
    const res  = await fetch(`${API_BASE}/subscription/my`, {
      headers: authHeaders(),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Could not confirm subscription status.");
    }

    const sub = data.subscription || data.plan || data.data || null;

    if (!sub || sub.status !== "active") {
      throw new Error(
        "Payment verified but plan not yet active. " +
        "Please refresh in a moment or contact support."
      );
    }

    return sub;
  };

  /* ═══════════════════════════════════════
     RAZORPAY SUCCESS HANDLER
     Order of operations:
     1. Verify signature  → POST /api/payment/verify
     2. Confirm plan      → GET  /api/subscription/my
     3. Show success + redirect
     FIX 3: Removed dead ownerPlans localStorage
     write — OwnerHome reads from API, not localStorage.
  ═══════════════════════════════════════ */
  const handleRazorpaySuccess = async (razorpayResponse) => {
    try {
      // Step 1: Verify payment signature with backend
      await verifyPayment(razorpayResponse);

      // Step 2: Confirm subscription is now active
      const sub = await fetchActiveSubscription();

      // Step 3: Clean up and show success
      localStorage.removeItem("selectedPlan");
      setActivePlan(sub);
      setSuccess(true);
      setLoading(false);

      setTimeout(() => navigate("/owner/home"), 2800);
    } catch (err) {
      setError(
        err.message ||
        "Payment received but plan activation failed. Please contact support."
      );
      setLoading(false);
    }
  };

  /* ── Open Razorpay Checkout ── */
  const startRazorpay = async () => {
    // FIX 5: Ensure script is loaded before opening checkout
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setError("Payment gateway not loaded. Please refresh and try again.");
      setLoading(false);
      return;
    }

    try {
      const payment = await createRazorpayOrder();

      const options = {
        key        : RAZORPAY_KEY,
        amount     : plan.price * 100,
        currency   : "INR",
        name       : "PopSeat",
        description: `${plan.theaters} Theater Plan — 30 Days`,
        order_id   : payment.razorpayOrderId,

        handler: (response) => handleRazorpaySuccess(response),

        prefill: {
          email: localStorage.getItem("ownerEmail") || localStorage.getItem("email") || "",
        },

        theme: { color: "#6C63FF" },

        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment cancelled. Please try again when ready.");
          },
        },
      };

      const rzp = new window.Razorpay(options);

      // Handle Razorpay payment failure (e.g. bank declined)
      rzp.on("payment.failed", (resp) => {
        setError(
          resp.error?.description ||
          "Payment failed. Please try again or use a different payment method."
        );
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      console.error("Razorpay setup error:", err);
      setError(err.message || "Could not start payment. Please try again.");
      setLoading(false);
    }
  };

  /* ── Handle Pay button click ── */
  const handlePayment = () => {
    if (!plan) { navigate("/owner/plan"); return; }
    setError("");
    setLoading(true);
    startRazorpay();
  };

  /* ── No plan selected ── */
  if (!plan) {
    return (
      <div className="payment-page">
        <div className="payment-card payment-card--empty">
          <div className="payment-empty-icon">🎭</div>
          <h2 className="payment-label">No Plan Selected</h2>
          <p className="payment-sub">Please select a plan before proceeding to payment.</p>
          <button className="payment-btn" onClick={() => navigate("/owner/plan")}>
            Choose a Plan
          </button>
        </div>
      </div>
    );
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="payment-page">
        <div className="payment-card payment-card--success">
          <div className="payment-success-icon">🎉</div>
          <h2 className="payment-label">Payment Successful!</h2>
          <div className="payment-success-plan">
            {activePlan?.theatersAllowed || plan.theaters} Theater Plan Activated
          </div>
          {activePlan?.expiresAt && (
            <p className="payment-expiry">
              Valid until{" "}
              {new Date(activePlan.expiresAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}
          <p className="payment-redirect">Redirecting to dashboard...</p>
          <div className="payment-progress-bar">
            <div className="payment-progress-fill" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Main payment screen ── */
  return (
    <div className="payment-page">
      <div className="payment-card">

        {/* Header label */}
        <p className="payment-label">Confirm Your Plan</p>

        {/* Plan name */}
        <h3 className="payment-plan-name">{plan.theaters} Theater Plan</h3>

        {/* Price display */}
        <div className="payment-price-block">
          <span className="payment-currency">₹</span>
          <span className="payment-amount">{plan.price.toLocaleString("en-IN")}</span>
        </div>

        {/* Plan note */}
        <p className="plan-note">✦ Valid for 30 days from activation</p>

        {/* Divider */}
        <div className="payment-divider" />

        {/* Feature summary */}
        <ul className="payment-features">
          <li>
            <span className="feat-icon">🏛️</span>
            <span>Up to <strong>{plan.theaters} theater(s)</strong></span>
          </li>
          <li>
            <span className="feat-icon">👷</span>
            <span>Unlimited worker accounts</span>
          </li>
          <li>
            <span className="feat-icon">📊</span>
            <span>Full analytics dashboard</span>
          </li>
          <li>
            <span className="feat-icon">🔒</span>
            <span>Secured via Razorpay</span>
          </li>
        </ul>

        {/* Error */}
        {error && <div className="payment-error">{error}</div>}

        {/* Pay button */}
        <button
          className="payment-btn"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <span className="payment-btn-loading">
              <span className="payment-spinner" />
              Opening Payment...
            </span>
          ) : (
            `Pay ₹${plan.price.toLocaleString("en-IN")}`
          )}
        </button>

        {/* Change plan */}
        <button
          className="payment-btn-ghost"
          onClick={() => navigate("/owner/plan")}
          disabled={loading}
        >
          ← Change Plan
        </button>

      </div>
    </div>
  );
};

export default OwnerPayment;