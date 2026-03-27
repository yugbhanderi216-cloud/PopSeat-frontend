import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PaymentPage.css";

// APIs USED:
//   POST /api/payment/create     ✅ confirmed — creates Razorpay order server-side
//   POST /api/order/create       ✅ confirmed — creates food order (after payment created)
//   POST /api/payment/verify     ✅ mock mode — sends { orderId: payment._id }

const API_BASE     = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const PaymentPage = () => {

  const navigate  = useNavigate();
  const location  = useLocation();
  const params    = new URLSearchParams(location.search);

  const seatId    = params.get("seatId") || localStorage.getItem("customerSeatId");
  const token     = localStorage.getItem("customerToken") || "";
  const theaterId = localStorage.getItem("customerTheaterId") || "";
  const hallId    = params.get("hallId") || localStorage.getItem("customerHallId") || localStorage.getItem("hallId") || "";
  const screen    = localStorage.getItem("screenNo") || "";
  const seat      = localStorage.getItem("seatNo")   || "";

  const [cart,    setCart]    = useState([]);
  const [method,  setMethod]  = useState("razorpay");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(savedCart);
    } catch {
      setCart([]);
    }
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.finalPrice || item.price || 0) * item.quantity,
    0
  );

  const authHeaders = () => ({
    "Content-Type" : "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  });

  /* ===============================
     STEP 1: CREATE RAZORPAY ORDER SERVER-SIDE
     POST /api/payment/create ✅
     Body: { amount, currency, orderId }
     Response: { success, payment: { _id, razorpayOrderId, amount } }
     Must run FIRST so payment._id is available
     for createFoodOrder and verifyPayment.
  =============================== */

  const createRazorpayOrder = async () => {

    const res  = await fetch(`${API_BASE}/payment/create`, {
      method  : "POST",
      headers : authHeaders(),
      body    : JSON.stringify({
        amount   : total * 100, // paise
        currency : "INR",
        orderId  : seatId || "food-order",
      }),
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.message || "Could not create payment order.");

    if (!data.payment?.razorpayOrderId) {
      throw new Error("Backend did not return razorpayOrderId. Please contact support.");
    }

    return data.payment; // { _id, razorpayOrderId, amount }

  };

  /* ===============================
     STEP 2: CREATE FOOD ORDER
     POST /api/order/create ✅
     Body includes razorpayOrderId = payment._id
     so the order is linked to the payment record.
  =============================== */

  const createFoodOrder = async (paymentId) => {

    const items = cart.map((item) => ({
      menuId   : item.menuId || item._id,
      name     : item.name,
      quantity : item.quantity,
      price    : Number(item.finalPrice || item.price || 0),
    }));

    const res  = await fetch(`${API_BASE}/order`, {
      method  : "POST",
      headers : authHeaders(),
      body    : JSON.stringify({
        seatNumber      : seat || seatId || "Unknown",
        hallId          : hallId || "Unknown",
        totalAmount     : total,
        razorpayOrderId : paymentId,
        items,
      }),
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.message || "Order creation failed.");

    return data; // data.order._id

  };

  /* ===============================
     STEP 3: VERIFY PAYMENT (MOCK)
     POST /api/payment/verify ✅
     Mock mode: sends only { orderId: payment._id }
     No signature verification required.
  =============================== */

  const verifyPayment = async (paymentId) => {

    const res  = await fetch(`${API_BASE}/payment/verify`, {
      method  : "POST",
      headers : authHeaders(),
      body    : JSON.stringify({
        orderId: paymentId,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Payment verification failed.");
    }

    return data;

  };

  /* ===============================
     RAZORPAY FLOW (MOCK MODE)
     Order:
       1. POST /api/payment/create  → get payment._id + razorpayOrderId
       2. POST /api/order/create    → link order to payment._id
       3. Open Razorpay checkout
       4. On success → ignore Razorpay response
       5. POST /api/payment/verify  → { orderId: payment._id }
       6. Save to localStorage → navigate to tracking
  =============================== */

  const startRazorpay = async () => {

    if (!window.Razorpay) {
      setError("Razorpay SDK not loaded. Please refresh and try again.");
      setLoading(false);
      return;
    }

    try {

      // Step 1 — create Razorpay order first to get payment._id
      const payment = await createRazorpayOrder();

      // Step 2 — create food order linked to payment._id
      const orderData       = await createFoodOrder(payment._id);
      const internalOrderId = orderData.order?._id;

      // Step 3 — open Razorpay checkout
      const options = {
        key         : RAZORPAY_KEY,
        amount      : total * 100,
        currency    : "INR",
        name        : "PopSeat Cinema",
        description : "Food Order Payment",
        order_id    : payment.razorpayOrderId,

        // Step 4 — ignore Razorpay response; use payment._id from closure
        handler: async () => {

          try {

            // Step 5 — mock verify
            await verifyPayment(payment._id);

            // Step 6 — save and navigate
            localStorage.setItem("currentOrderId",   internalOrderId || "");
            localStorage.setItem("currentPaymentId", payment._id     || "");
            localStorage.removeItem("cart");

            navigate(`/tracking?theaterId=${theaterId}&screen=${screen}&seat=${seat}`);

          } catch (verifyErr) {
            setError(verifyErr.message || "Payment verification failed. Contact support.");
            setLoading(false);
          }

        },

        prefill: {
          email: localStorage.getItem("customerEmail") || "",
        },

        theme: { color: "#b5633c" },

        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment cancelled. Please try again.");
          },
        },

      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (resp) => {
        setError(
          resp.error?.description ||
          "Payment failed. Please try a different payment method."
        );
        setLoading(false);
      });

      rzp.open();

    } catch (err) {
      console.error("Razorpay flow error:", err);
      setError(err.message || "Could not start payment. Please try again.");
      setLoading(false);
    }

  };

  /* ===============================
     DIRECT UPI FLOW (unchanged)
     ⚠️  UPI intent doesn't return a signature
         back to the app — webhook on backend
         is the proper solution for verification.
  =============================== */

  const startUPIIntent = async () => {

    const upiId = "yourupi@okhdfcbank"; // 🔑 replace with real UPI ID

    try {

      const orderData       = await createFoodOrder("UPI_MANUAL_" + Date.now());
      const internalOrderId = orderData.order?._id;

      const link = `upi://pay?pa=${upiId}&pn=PopSeat&am=${total}&cu=INR`;
      window.location.href = link;

      setTimeout(() => {
        localStorage.setItem("currentOrderId", internalOrderId || "");
        localStorage.removeItem("cart");
        navigate(`/tracking?theaterId=${theaterId}&screen=${screen}&seat=${seat}`);
      }, 4000);

    } catch (err) {
      setError(err.message || "Could not process UPI payment.");
      setLoading(false);
    }

  };

  /* ── Handle Pay click ── */

  const handlePayment = () => {

    if (cart.length === 0) { setError("Your cart is empty."); return; }
    if (!seatId) { setError("Seat not found. Please scan your QR code again."); return; }

    setError("");
    setLoading(true);

    if (method === "razorpay") startRazorpay();
    else startUPIIntent();

  };

  /* ── Empty cart ── */

  if (cart.length === 0 && !loading) {
    return (
      <div className="payment-page">
        <h2 className="payment-title">Complete Payment</h2>
        <div className="summary-box" style={{ textAlign: "center", padding: 32 }}>
          <p>Your cart is empty.</p>
          <button className="pay-btn" style={{ marginTop: 16 }}
            onClick={() => navigate(`/customer/menu?theaterId=${theaterId}&screen=${screen}&seat=${seat}`)}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  /* ── Render ── */

  return (

    <div className="payment-page">

      <h2 className="payment-title">Complete Payment</h2>

      <div className="payment-layout">

        {/* ORDER SUMMARY */}
        <div className="summary-box">
          <h3>Order Summary</h3>
          {cart.map((item, i) => (
            <div key={item.cartKey || item._id || i} className="summary-item">
              <span>
                {item.name}{item.size ? ` (${item.size})` : ""} × {item.quantity}
              </span>
              <span>₹ {Number(item.finalPrice || item.price || 0) * item.quantity}</span>
            </div>
          ))}
          <div className="summary-total">Total: ₹ {total}</div>
        </div>

        {/* PAYMENT METHOD */}
        <div className="method-box">
          <h3>Select Payment Method</h3>
          <label>
            <input type="radio" value="razorpay" checked={method === "razorpay"}
              onChange={() => setMethod("razorpay")} />
            Pay via UPI / Paytm / PhonePe / Cards
          </label>
          <label>
            <input type="radio" value="upi" checked={method === "upi"}
              onChange={() => setMethod("upi")} />
            Direct UPI App
          </label>
        </div>

      </div>

      {error && (
        <p style={{ color: "red", textAlign: "center", margin: "8px 0" }}>{error}</p>
      )}

      <div className="pay-container">
        <button
          className="pay-btn"
          onClick={handlePayment}
          disabled={loading || cart.length === 0}
        >
          {loading ? "Processing..." : `Pay ₹ ${total}`}
        </button>
      </div>

    </div>

  );

};

export default PaymentPage;