import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RenewPlan.css";

// APIs USED:
//   GET  /api/subscription/my    ✅ — load current plan + get real planId
//   POST /api/payment/create     ✅ — create Razorpay order server-side
//   POST /api/payment/verify     ✅ — verify Razorpay signature (MUST run before renew)
//   POST /api/owner/renew        ✅ — extend subscription after payment verified
//     Body: { planId, razorpay_order_id, razorpay_payment_id }

const API_BASE     = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const getOwnerToken = () =>
  localStorage.getItem("ownerToken") || localStorage.getItem("token") || "";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization : `Bearer ${getOwnerToken()}`,
});

const RENEWAL_OPTIONS = [
  { label: "1 Month",  months: 1,  days: 30,  price: 500  },
  { label: "6 Months", months: 6,  days: 180, price: 2800 },
  { label: "1 Year",   months: 12, days: 365, price: 5500 },
];

/* ── Load Razorpay script dynamically ──
   FIX 4: If user refreshes on this page, window.Razorpay won't exist.
   Loader ensures script is present before payment starts. */
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const RenewPlan = () => {
  const navigate = useNavigate();
  const token    = getOwnerToken();

  const [subscription,  setSubscription]  = useState(null);
  const [subLoading,    setSubLoading]    = useState(true);
  const [loading,       setLoading]       = useState(false);
  const [loadingOption, setLoadingOption] = useState(null); // FIX 7: store label not months
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState(false);
  const [renewedUntil,  setRenewedUntil]  = useState("");

  /* Pre-load Razorpay on mount */
  useEffect(() => { loadRazorpayScript(); }, []);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  /* ═══════════════════════════════════════
     GET /api/subscription/my ✅
     planId for /api/owner/renew MUST come
     from this response (_id field).
  ═══════════════════════════════════════ */
  useEffect(() => {
    if (!token) return;

    const fetchSubscription = async () => {
      setSubLoading(true);
      try {
        const res  = await fetch(`${API_BASE}/subscription/my`, {
          headers: authHeaders(),
        });
        const data = await res.json();

        if (data.success) {
          const sub = data.subscription || data.plan || data.data || null;
          setSubscription(sub);
          // Save real planId as fallback for refresh safety
          if (sub?._id) localStorage.setItem("renewPlanId", sub._id);
        }
      } catch (err) {
        console.warn("Subscription fetch error:", err);
        // FIX 3: Removed dead ownerPlans localStorage fallback.
        // Nothing in the app writes ownerPlans — it always returned [].
        setSubscription(null);
      } finally {
        setSubLoading(false);
      }
    };

    fetchSubscription();
  }, [token]);

  /* ── Calculate new expiry from current plan or today ──
     FIX 5: Guard against null subscription before calculating */
  const calculateNewExpiry = (days) => {
    const today     = new Date();
    const curExpiry = subscription?.expiresAt ? new Date(subscription.expiresAt) : today;
    const base      = curExpiry > today ? curExpiry : today;
    return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  };

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "—";

  /* ═══════════════════════════════════════
     POST /api/payment/create ✅
     Creates Razorpay order server-side.
     FIX 2: Only use razorpayOrderId — never
     fall back to payment._id which is a
     MongoDB ID and will break Razorpay checkout.
  ═══════════════════════════════════════ */
  const createRazorpayOrder = async (option) => {
    const res  = await fetch(`${API_BASE}/payment/create`, {
      method : "POST",
      headers: authHeaders(),
      body   : JSON.stringify({
        amount  : option.price * 100, // in paise
        currency: "INR",
        orderId : subscription?._id || localStorage.getItem("renewPlanId") || "renew",
      }),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.message || "Could not create payment order.");

    // FIX 2: Strictly require razorpayOrderId — no fallback to _id
    if (!data.payment?.razorpayOrderId) {
      throw new Error("Backend did not return razorpayOrderId. Please contact support.");
    }

    return data.payment;
  };

  /* ═══════════════════════════════════════
     POST /api/payment/verify ✅
     FIX 1: MUST verify signature before
     calling /api/owner/renew. Previously
     this was skipped entirely — allowing
     anyone to fake a successful payment.
  ═══════════════════════════════════════ */
  const verifyPayment = async (razorpayResponse) => {
    const res  = await fetch(`${API_BASE}/payment/verify`, {
      method : "POST",
      headers: authHeaders(),
      body   : JSON.stringify({
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
     POST /api/owner/renew ✅
     Called AFTER payment is verified.
     planId must be subscription._id from
     GET /api/subscription/my — NOT hardcoded.
  ═══════════════════════════════════════ */
  const renewSubscription = async (razorpayResponse) => {
    const realPlanId = subscription?._id || localStorage.getItem("renewPlanId");

    if (!realPlanId) {
      throw new Error("Could not find your plan ID. Please go back and try again.");
    }

    const res  = await fetch(`${API_BASE}/owner/renew`, {
      method : "POST",
      headers: authHeaders(),
      body   : JSON.stringify({
        planId              : realPlanId,
        razorpay_order_id   : razorpayResponse.razorpay_order_id,
        razorpay_payment_id : razorpayResponse.razorpay_payment_id,
      }),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.message || "Renewal failed on server.");

    return data;
  };

  /* ═══════════════════════════════════════
     RAZORPAY SUCCESS HANDLER
     Order:
       1. POST /api/payment/verify  ✅ (FIX 1)
       2. POST /api/owner/renew     ✅
       3. Show success + redirect
  ═══════════════════════════════════════ */
  const handleRazorpaySuccess = async (razorpayResponse, option) => {
    const newExpiry = calculateNewExpiry(option.days);
    try {
      // Step 1 — verify signature
      await verifyPayment(razorpayResponse);

      // Step 2 — renew on server
      await renewSubscription(razorpayResponse);

      // Step 3 — show success
      setRenewedUntil(
        newExpiry.toLocaleDateString("en-IN", {
          day: "numeric", month: "long", year: "numeric",
        })
      );
      localStorage.removeItem("renewPlanId");
      setSuccess(true);
      setLoading(false);
      setLoadingOption(null);
      setTimeout(() => navigate("/owner/home"), 2800);
    } catch (err) {
      setError(err.message || "Renewal failed after payment. Please contact support.");
      setLoading(false);
      setLoadingOption(null);
    }
  };

  /* ── Open Razorpay checkout ── */
  const startRazorpay = async (option) => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setError("Payment gateway not loaded. Please refresh and try again.");
      setLoading(false);
      setLoadingOption(null);
      return;
    }

    try {
      const payment = await createRazorpayOrder(option);

      const rzpOptions = {
        key        : RAZORPAY_KEY,
        amount     : option.price * 100,
        currency   : "INR",
        name       : "PopSeat",
        description: `${option.label} Plan Renewal`,
        order_id   : payment.razorpayOrderId, // FIX 2: never use _id

        handler: (response) => handleRazorpaySuccess(response, option),

        prefill: {
          email: localStorage.getItem("ownerEmail") || localStorage.getItem("email") || "",
        },

        theme: { color: "#6C63FF" },

        modal: {
          ondismiss: () => {
            setLoading(false);
            setLoadingOption(null);
            setError("Payment cancelled. Please try again.");
          },
        },
      };

      const rzp = new window.Razorpay(rzpOptions);

      rzp.on("payment.failed", (resp) => {
        setError(
          resp.error?.description ||
          "Payment failed. Please try a different payment method."
        );
        setLoading(false);
        setLoadingOption(null);
      });

      rzp.open();
    } catch (err) {
      console.error("Razorpay setup error:", err);
      setError(err.message || "Could not start payment. Please try again.");
      setLoading(false);
      setLoadingOption(null);
    }
  };

  const handleSelectOption = (option) => {
    if (!subscription) {
      setError("No active plan found. Please purchase a plan first.");
      return;
    }
    setError("");
    setLoading(true);
    setLoadingOption(option.label); // FIX 7: use label (unique) not months
    startRazorpay(option);
  };

  /* ── No valid plan ── */
  if (!subLoading && !subscription) {
    return (
      <div className="renew-container">
        <div className="plan-cover">
          <p className="renew-eyebrow">PopSeat Platform</p>
          <h1 className="renew-title">Renew Your Plan</h1>
        </div>
        <div className="renew-empty">
          <div className="renew-empty-icon">📋</div>
          <p className="renew-empty-text">No active plan found. Please purchase a plan first.</p>
          <button className="renew-empty-btn" onClick={() => navigate("/owner/plan")}>
            View Plans
          </button>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (success) {
    return (
      <div className="renew-container">
        <div className="plan-cover">
          <p className="renew-eyebrow">PopSeat Platform</p>
          <h1 className="renew-title">Renew Your Plan</h1>
        </div>
        <div className="renew-success">
          <div className="renew-success-icon">🎉</div>
          <h2 className="renew-success-heading">Plan Renewed!</h2>
          <p className="renew-success-expiry">
            Your plan is now active until <strong>{renewedUntil}</strong>
          </p>
          <p className="renew-success-redirect">Redirecting to dashboard...</p>
          <div className="renew-progress-bar">
            <div className="renew-progress-fill" />
          </div>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="renew-container">

      {/* HEADER */}
      <div className="plan-cover">
        <p className="renew-eyebrow">PopSeat Platform</p>
        <h1 className="renew-title">Renew Your Plan</h1>
        <p className="renew-subtitle">
          Extend your subscription and keep managing your theaters without interruption.
        </p>
        <div className="renew-title-line" />
      </div>

      {/* CURRENT PLAN BANNER — FIX 6: no inline styles */}
      {!subLoading && subscription && (
        <div className="renew-current-plan">
          <span className="renew-current-label">Current plan expires:</span>
          <span className={`renew-current-date ${
            new Date(subscription.expiresAt) < new Date() ? "expired" : "active"
          }`}>
            {formatDate(subscription.expiresAt)}
          </span>
          {subscription.theatersAllowed && (
            <span className="renew-current-theaters">
              · {subscription.theatersAllowed} theater(s)
            </span>
          )}
        </div>
      )}

      {/* ERROR */}
      {error && <div className="renew-error">{error}</div>}

      {/* RENEWAL CARDS */}
      <div className="plan-row">
        {RENEWAL_OPTIONS.map((option) => {
          const previewExpiry = subscription ? calculateNewExpiry(option.days) : null;
          const isThisLoading = loading && loadingOption === option.label; // FIX 7

          return (
            <div
              key={option.label}
              className={`plan-card ${option.months === 6 ? "featured" : ""}`}
            >
              {option.months === 6 && (
                <div className="renew-badge">Best Value</div>
              )}

              <h2 className="renew-card-title">{option.label}</h2>

              <div className="renew-price-row">
                <span className="renew-currency">₹</span>
                <span className="renew-price">{option.price.toLocaleString("en-IN")}</span>
              </div>

              {previewExpiry && (
                <p className="renew-preview-expiry">
                  Extends to{" "}
                  {previewExpiry.toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              )}

              <div className="renew-divider" />

              <ul className="renew-features">
                <li>{option.months} month{option.months > 1 ? "s" : ""} access</li>
                <li>All theaters included</li>
                <li>Full analytics</li>
                <li>Priority support</li>
              </ul>

              <button
                className="renew-btn"
                onClick={() => handleSelectOption(option)}
                disabled={loading}
              >
                {isThisLoading ? (
                  <span className="renew-btn-loading">
                    <span className="renew-spinner" />
                    Opening...
                  </span>
                ) : (
                  "Renew Now"
                )}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default RenewPlan;