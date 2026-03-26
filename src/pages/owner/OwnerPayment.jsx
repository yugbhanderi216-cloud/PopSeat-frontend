import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPayment.css";

// APIs USED:
//   POST /api/payment/create   ✅ — creates Razorpay order server-side
//   POST /api/payment/verify   ✅ — verifies Razorpay signature (MUST be called)
//   GET  /api/subscription/my  ✅ — confirms plan is active after payment
//
// ─────────────────────────────────────────────────────────────
// NOTE FOR BACKEND TEAM — orderId field in POST /api/payment/create:
//
//   Subscription payments do NOT have a food/cinema order ID.
//   The backend MUST make orderId optional for subscription flows.
//   The owner is identified via the JWT token (Authorization header).
//
//   Recommended response shape:
//     { success: true, payment: { razorpayOrderId: "order_xxx", amount, currency } }
//
//   If orderId is truly required by your schema, two options:
//     Option A — Accept a descriptive string:
//       orderId: "subscription" (backend treats it as a type flag)
//     Option B — Create a stub payment record first:
//       POST /api/payment/init → returns { _id } → use that _id as orderId
//
//   This file sends orderId: "subscription" as a safe fallback.
//   Remove it from the body once the backend marks orderId optional.
// ─────────────────────────────────────────────────────────────

const API_BASE     = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const getOwnerToken = () =>
  localStorage.getItem("ownerToken") || localStorage.getItem("token") || "";

const authHeaders = () => ({
  "Content-Type" : "application/json",
  Authorization  : `Bearer ${getOwnerToken()}`,
});

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
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

  useEffect(() => { loadRazorpayScript(); }, []);

  // ─────────────────────────────────────────────────────────
  //  POST /api/payment/create
  //
  //  FIX: orderId is not available for subscription payments —
  //  the owner has no food/cinema order at this stage.
  //  We send orderId: "subscription" so backends that require
  //  the field don't reject the request with a validation error.
  //  The backend SHOULD identify the owner from the JWT token
  //  and treat orderId as optional for subscription flows.
  //
  //  Two-step fallback built in:
  //    1. Try without orderId first (cleanest, works if backend
  //       marks the field optional — which it should).
  //    2. If the backend returns a 400 with a message containing
  //       "orderId" or "order_id", retry with orderId: "subscription"
  //       as a safe descriptor string.
  //  This avoids silent failures either way.
  // ─────────────────────────────────────────────────────────
  const createRazorpayOrder = async () => {
    const body = {
      amount  : plan.price * 100,   // paise
      currency: "INR",
      // orderId intentionally omitted on first attempt —
      // backend should not require it for subscription payments.
    };

    let res  = await fetch(`${API_BASE}/payment/create`, {
      method  : "POST",
      headers : authHeaders(),
      body    : JSON.stringify(body),
    });

    let data = await res.json();

    // ── Fallback: if backend rejects due to missing orderId ──
    // Check for a 400 that explicitly mentions orderId in the message.
    // This keeps the retry narrow — other 400 errors are not retried.
    if (
      !res.ok &&
      res.status === 400 &&
      typeof data.message === "string" &&
      /order.?id/i.test(data.message)
    ) {
      console.warn(
        "POST /api/payment/create: backend requires orderId for subscription. " +
        "Retrying with orderId: 'subscription'. " +
        "Backend team: please make orderId optional for subscription flows."
      );

      res  = await fetch(`${API_BASE}/payment/create`, {
        method  : "POST",
        headers : authHeaders(),
        body    : JSON.stringify({ ...body, orderId: "subscription" }),
      });
      data = await res.json();
    }

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Could not create payment order.");
    }

    if (!data.payment?.razorpayOrderId) {
      throw new Error(
        "Backend did not return razorpayOrderId. Please contact support."
      );
    }

    return data.payment;
  };

  // ─────────────────────────────────────────────────────────
  //  POST /api/payment/verify
  //  Verifies Razorpay signature server-side — must not be skipped.
  // ─────────────────────────────────────────────────────────
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
      throw new Error(
        data.message || "Payment verification failed. Please contact support."
      );
    }

    return data;
  };

  // ─────────────────────────────────────────────────────────
  //  GET /api/subscription/my
  //  Confirms the plan is active after payment + verification.
  // ─────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────
  //  Razorpay success handler
  //  Order: verify signature → confirm subscription → redirect
  // ─────────────────────────────────────────────────────────
  const handleRazorpaySuccess = async (razorpayResponse) => {
    try {
      await verifyPayment(razorpayResponse);
      const sub = await fetchActiveSubscription();
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

  // ─────────────────────────────────────────────────────────
  //  Open Razorpay checkout
  // ─────────────────────────────────────────────────────────
  const startRazorpay = async () => {
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

  const handlePayment = () => {
    if (!plan) { navigate("/owner/plan"); return; }
    setError("");
    setLoading(true);
    startRazorpay();
  };

  // ── No plan ──
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

  // ── Success ──
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

  // ── Main ──
  return (
    <div className="payment-page">
      <div className="payment-card">

        <p className="payment-label">Confirm Your Plan</p>
        <h3 className="payment-plan-name">{plan.theaters} Theater Plan</h3>

        <div className="payment-price-block">
          <span className="payment-currency">₹</span>
          <span className="payment-amount">{plan.price.toLocaleString("en-IN")}</span>
        </div>

        <p className="plan-note">✦ Valid for 30 days from activation</p>

        <div className="payment-divider" />

        <ul className="payment-features">
          <li><span className="feat-icon">🏛️</span><span>Up to <strong>{plan.theaters} theater(s)</strong></span></li>
          <li><span className="feat-icon">👷</span><span>Unlimited worker accounts</span></li>
          <li><span className="feat-icon">📊</span><span>Full analytics dashboard</span></li>
          <li><span className="feat-icon">🔒</span><span>Secured via Razorpay</span></li>
        </ul>

        {error && <div className="payment-error">{error}</div>}

        <button className="payment-btn" onClick={handlePayment} disabled={loading}>
          {loading ? (
            <span className="payment-btn-loading">
              <span className="payment-spinner" />
              Opening Payment...
            </span>
          ) : (
            `Pay ₹${plan.price.toLocaleString("en-IN")}`
          )}
        </button>

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