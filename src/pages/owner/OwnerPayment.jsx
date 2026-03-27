import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPayment.css";

// APIs USED:
//   POST /api/payment/create         — creates mock payment record, returns { payment: { _id, razorpayOrderId } }
//   POST /api/payment/verify         — marks payment complete, body: { orderId: payment._id }
//   POST /api/subscription/activate  — activates the subscription plan, body: { plan }
//   GET  /api/subscription/my        — confirms plan is active after activation

const API_BASE     = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const getOwnerToken = () =>
  localStorage.getItem("ownerToken") || localStorage.getItem("token") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getOwnerToken()}`,
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

  const [plan] = useState(() => {
    try { return JSON.parse(localStorage.getItem("selectedPlan")) || null; }
    catch { return null; }
  });

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  useEffect(() => { loadRazorpayScript(); }, []);

  // ── Step 1: Create payment record on backend ──
  // Backend must return: { success: true, payment: { _id, razorpayOrderId } }
  const createPaymentOrder = async () => {
    const res = await fetch(`${API_BASE}/payment/create`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        amount  : plan.price * 100, // paise
        currency: "INR",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Could not create payment order.");
    }

    if (!data.payment?._id || !data.payment?.razorpayOrderId) {
      throw new Error("Invalid response from server. Please contact support.");
    }

    return data.payment; // { _id, razorpayOrderId }
  };

  // ── Step 2: Verify payment using DB payment _id (mock mode) ──
  // No Razorpay signature — backend just marks payment as completed
  const verifyPayment = async (paymentId) => {
    const res = await fetch(`${API_BASE}/payment/verify`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        orderId: paymentId, // your DB payment._id
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Payment verification failed.");
    }

    return data;
  };

  // ── Step 3: Activate the subscription plan ──
  // Must be called after verify and before fetching subscription status
  const activateSubscription = async () => {
    const res = await fetch(`${API_BASE}/subscription/activate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        plan: plan.name || "basic",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Subscription activation failed.");
    }

    return data;
  };

  // ── Step 4: Confirm subscription is active ──
  const fetchActiveSubscription = async () => {
    const res  = await fetch(`${API_BASE}/subscription/my`, {
      headers: authHeaders(),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Could not confirm subscription status.");
    }

    const sub = data.subscription || data.plan || data.data || null;

    if (!sub || sub.status?.toLowerCase() !== "active") {
      throw new Error(
        "Plan activation failed. Please refresh or contact support."
      );
    }

    return sub;
  };

  // ── Razorpay success handler ──
  // Flow: verify → activate → fetch → show success
  const handleRazorpaySuccess = async (paymentId) => {
    try {
      await verifyPayment(paymentId);
      await activateSubscription();
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

  // ── Open Razorpay checkout ──
  const startRazorpay = async () => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setError("Payment gateway not loaded. Please refresh and try again.");
      setLoading(false);
      return;
    }

    try {
      const payment = await createPaymentOrder(); // { _id, razorpayOrderId }

      const options = {
        key        : RAZORPAY_KEY,
        amount     : plan.price * 100,
        currency   : "INR",
        name       : "PopSeat",
        description: `${plan.theaters} Theater Plan — 30 Days`,
        order_id   : payment.razorpayOrderId,

        // Pass DB _id directly — ignore Razorpay response object entirely
        handler: () => handleRazorpaySuccess(payment._id),

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