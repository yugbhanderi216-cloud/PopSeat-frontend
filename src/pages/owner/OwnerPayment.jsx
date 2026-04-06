import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerPayment.css";

// APIs USED:
//   GET  /api/subscription/upgrade-cost  — calculates prorated cost if upgrading
//   POST /api/payment/create-order       — creates payment record, returns { payment: { _id, razorpayOrderId } } or similar
//   POST /api/subscription/buy           — activates new subscription
//   POST /api/subscription/upgrade       — activates upgraded subscription
//   GET  /api/subscription/my            — confirms plan is active after activation

const API_BASE = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const getAuthToken = () => localStorage.getItem("token") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const OwnerPayment = () => {
  const navigate = useNavigate();

  const [plan] = useState(() => {
    try { return JSON.parse(localStorage.getItem("selectedPlan")) || null; }
    catch { return null; }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  const [fetchingCost, setFetchingCost] = useState(plan?.isUpgrade || false);
  const [upgradeData, setUpgradeData] = useState(null);

  useEffect(() => { loadRazorpayScript(); }, []);

  useEffect(() => {
    if (plan?.isUpgrade) {
      const fetchUpgradeCost = async () => {
        try {
          const res = await fetch(`${API_BASE}/subscription/upgrade-cost?newPlanId=${plan.id}`, { headers: authHeaders() });
          const data = await res.json();
          if (data.success) {
            setUpgradeData(data);
          } else {
            setError(data.message || "Could not calculate upgrade cost.");
          }
        } catch (err) {
          setError("Network error fetching upgrade cost.");
        } finally {
          setFetchingCost(false);
        }
      };
      fetchUpgradeCost();
    } else {
      setFetchingCost(false);
    }
  }, [plan]);

  const finalAmount = plan?.isUpgrade && upgradeData ? upgradeData.upgradeCost : (plan?.price || 0);

  // ── Step 1: Create payment order ──
  const createPaymentOrder = async () => {
    const res = await fetch(`${API_BASE}/payment/create-order`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        amount: finalAmount * 100, // paise
        // currency: "INR", // if needed
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Could not create payment order.");
    }

    // Adapt to potential payload variations
    const paymentRecord = data.payment || data.order || data;
    if (!paymentRecord?._id && !paymentRecord?.razorpayOrderId && !paymentRecord?.id) {
       console.warn("Unexpected order payload", data);
    }

    return paymentRecord;
  };

  // ── Step 2/3: Complete Purchase (buy or upgrade) ──
  const completePurchase = async (paymentId, orderId) => {
    const url = plan?.isUpgrade ? `${API_BASE}/subscription/upgrade` : `${API_BASE}/subscription/buy`;
    
    const payload = {
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      amountPaid: finalAmount,
    };

    if (plan?.isUpgrade) {
      payload.newPlanId = plan.id;
    } else {
      payload.planId = plan.id;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Subscription activation failed.");
    }

    return data;
  };

  // ── Step 4: Confirm subscription is active ──
  const fetchActiveSubscription = async () => {
    const res = await fetch(`${API_BASE}/subscription/my`, {
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
  const handleRazorpaySuccess = async (paymentId, orderId) => {
    try {
      await completePurchase(paymentId, orderId);
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
      const payment = await createPaymentOrder();

      const options = {
        key: RAZORPAY_KEY,
        amount: finalAmount * 100,
        currency: "INR",
        name: "PopSeat",
        description: plan.isUpgrade ? `Upgrade to ${plan.name}` : `${plan.theaters} Theater Plan — 30 Days`,
        order_id: payment.razorpayOrderId || payment.id,

        handler: (response) => handleRazorpaySuccess(
          response.razorpay_payment_id, 
          payment.razorpayOrderId || payment.id || response.razorpay_order_id
        ),

        prefill: {
          email: localStorage.getItem("email") || "",
        },

        theme: { color: "#79334D" },

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
        <h3 className="payment-plan-name">{plan.name || plan.id} Theater Plan</h3>

        <div className="payment-price-block">
          <span className="payment-currency">₹</span>
          <span className="payment-amount">{finalAmount.toLocaleString("en-IN")}</span>
        </div>

        {plan.isUpgrade && (
          <p className="plan-upgrade-note" style={{ color: "#16a34a", fontSize: "14px", marginTop: "-8px", marginBottom: "12px", textAlign: "center", fontWeight: "500" }}>
            ✦ Prorated Upgrade Cost
          </p>
        )}

        <p className="plan-note">✦ Valid for 30 days from activation</p>

        <div className="payment-divider" />

        <ul className="payment-features">
          <li><span className="feat-icon">🏛️</span><span>Up to <strong>{plan.theaters} theater(s)</strong></span></li>
          <li><span className="feat-icon">👷</span><span>Unlimited worker accounts</span></li>
          <li><span className="feat-icon">📊</span><span>Full analytics dashboard</span></li>
          <li><span className="feat-icon">🔒</span><span>Secured via Razorpay</span></li>
        </ul>

        {error && <div className="payment-error">{error}</div>}

        <button className="payment-btn" onClick={handlePayment} disabled={loading || fetchingCost}>
          {loading || fetchingCost ? (
            <span className="payment-btn-loading">
              <span className="payment-spinner" />
              {fetchingCost ? "Calculating Cost..." : "Opening Payment..."}
            </span>
          ) : (
            `Pay ₹${finalAmount.toLocaleString("en-IN")}`
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
