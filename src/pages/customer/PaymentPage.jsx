import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./PaymentPage.css";
import SessionExpiredUI from "../component/SessionExpiredUI";

const API_BASE = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // 1. ✅ STANDARDIZED DATA EXTRACTION
  const sessionId = localStorage.getItem("sessionId") || "";
  const theaterId    = params.get("theaterId") || localStorage.getItem("theaterId") || "";
  const seatId       = params.get("seatId")    || localStorage.getItem("seatId")    || "";
  const hallId       = params.get("hallId")    || localStorage.getItem("hallId")    || "";

  // 2. ✅ NORMALIZE VALUES (VERY IMPORTANT)
  useEffect(() => {
    if (theaterId) localStorage.setItem("theaterId", theaterId);
    if (seatId) localStorage.setItem("seatId", seatId);
    if (hallId !== "Unknown") localStorage.setItem("hallId", hallId);
  }, [theaterId, seatId, hallId]);

  const screen = params.get("screen") || localStorage.getItem("screenNo") || "";
  const seat   = params.get("seat")   || localStorage.getItem("seatNo")   || "";
  const token  = localStorage.getItem("token") || "";

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  useEffect(() => {
    loadRazorpayScript();
    try {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(savedCart);
    } catch {
      setCart([]);
    }
  }, []);

  // ✅ Calling /api/order/create to create order
  const createFoodOrder = async () => {
    // ✅ STRICT VALIDATION BEFORE API CALL
    if (!sessionId) {
      throw new Error("Session information missing. Please scan QR again.");
    }

    if (!cart || cart.length === 0) {
      throw new Error("Cart is empty.");
    }

    // ✅ DEBUG LOG
    console.log("Creating Order with:", {
      sessionId,
      items: cart.map(i => ({ menuId: i._id, quantity: i.quantity }))
    });

    // ✅ CORRECT API CALL (NEW BACKEND ALIGNMENT)
    const res = await fetch(`${API_BASE}/order/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "session-id": sessionId
      },
      body: JSON.stringify({
        items: cart.map(i => ({
          menuId: i._id,
          quantity: i.quantity
        }))
      })
    });

    const data = await res.json();

    if (res.status === 401) {
      localStorage.removeItem("sessionId");
      // "Session expired" -> clear session and re-verify seat silently
      window.location.href = `/customer/welcome?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}&seat=${seat}`;
      throw new Error(data.message || "Session expired. Reinitializing...");
    }

    // ✅ SAFE ERROR HANDLING
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Order creation failed");
    }

    return data;
  };

  const verifyPayment = async (paymentId) => {
    const res = await fetch(`${API_BASE}/payment/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: paymentId }), 
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Payment verification failed.");
    return data;
  };

  const startRazorpay = async () => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setError("Payment gateway not loaded. Please refresh.");
      setLoading(false);
      return;
    }

    try {
      // 1. Create order and get payment details in one call
      const orderData = await createFoodOrder();
      
      const internalOrderId = orderData.order?._id;
      const internalPaymentId = orderData.payment?._id;
      const rzpOrderId = orderData.payment?.razorpayOrderId;

      const options = {
        key: RAZORPAY_KEY,
        amount: orderData.payment.amount,
        currency: "INR",
        name: "PopSeat Cinema",
        description: "Food Order Payment",
        order_id: rzpOrderId,
        handler: async () => {
          try {
            await verifyPayment(internalPaymentId);

            localStorage.setItem("currentOrderId", internalOrderId || "");
            localStorage.setItem("currentPaymentId", internalPaymentId || "");
            localStorage.removeItem("cart");

            navigate(`/tracking?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}`);
          } catch (verifyErr) {
            setError(verifyErr.message || "Payment verification failed.");
            setLoading(false);
          }
        },
        theme: { color: "#79334D" },
        modal: { ondismiss: () => { setLoading(false); setError("Payment cancelled."); } },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        setError(resp.error?.description || "Payment failed.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      // 6. ✅ SAFE ERROR HANDLING
      setError(err.response?.data?.message || err.message || "Order failed");
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (cart.length === 0) { setError("Your cart is empty."); return; }
    if (!sessionId) { 
      setError("Session missing. Please scan QR code again."); 
      return; 
    }
    setError("");
    setLoading(true);
    startRazorpay();
  };

  if (!sessionId) {
    // Instead of showing the error UI, we redirect for a silent refresh if we have params
    if (theaterId && seatId) {
      window.location.href = `/customer/welcome?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}&seat=${seat}`;
      return <div style={{ padding: "40px", textAlign: "center" }}>Refreshing session...</div>;
    }
    return <SessionExpiredUI />;
  }

  return (
    <div className="payment-page">
      <div className="payment-card">
        <p className="payment-label">Checkout Summary</p>
        <h1 className="payment-plan-name">Confirm Order</h1>

        <div className="payment-price-block">
          {/* Total is calculated securely by the backend upon order creation */}
          <span className="payment-amount">Confirming Details...</span>
        </div>

        <p className="plan-note">✦ Seat ID: {seatId}</p>
        <div className="payment-divider" />

        <div className="customer-order-list">
          {cart.map((item, i) => (
            <div key={item.cartKey || item._id || i} className="customer-order-item">
              <span className="item-name">
                {item.name}{item.size ? ` (${item.size})` : ""} × {item.quantity}
              </span>
            </div>
          ))}
        </div>

        {error && <div className="payment-error">{error}</div>}

        <button className="payment-btn" onClick={handlePayment} disabled={loading || cart.length === 0}>
          {loading ? (
            <span className="payment-btn-loading">
              <span className="payment-spinner" />
              Processing...
            </span>
          ) : (
            `Proceed to Pay`
          )}
        </button>

        <button className="payment-btn-ghost" onClick={() => navigate(-1)} disabled={loading}>
          ← Adjust Order
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;
