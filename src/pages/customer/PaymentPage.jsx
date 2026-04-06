import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./PaymentPage.css";

const API_BASE = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const seatId = params.get("seatId") || localStorage.getItem("seatId") || localStorage.getItem("customerSeatId") || "";
  const theaterId = params.get("theaterId") || localStorage.getItem("theaterId") || localStorage.getItem("customerTheaterId") || "";
  const hallId = params.get("hallId") || localStorage.getItem("hallId") || localStorage.getItem("customerHallId") || "";
  const screen = params.get("screen") || localStorage.getItem("screenNo") || "";
  const seat = params.get("seat") || localStorage.getItem("seatNo") || "";
  const token = localStorage.getItem("customerToken") || "";

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
  const authHeaders = () => ({
    "Content-Type": "application/json",
  });

  // ✅ Calling /api/orders to create order
  const createFoodOrder = async () => {
    const sessionStartTime = localStorage.getItem("sessionStartTime");

    const items = cart.map((item) => ({
      menuId: item.menuId || item._id,
      quantity: item.quantity,
    }));

    const res = await axios.post(`${API_BASE}/order`, {
      sessionStartTime: sessionStartTime ? Number(sessionStartTime) : Date.now(),
      theaterId: String(theaterId),
      seatId: String(seatId),
      hallId: String(hallId),
      items
    }, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });

    return res.data;
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

            navigate(`/tracking?theaterId=${theaterId}&screen=${screen}&seat=${seat}`);
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
      setError(err.message || "Could not start payment.");
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (cart.length === 0) { setError("Your cart is empty."); return; }
    if (!theaterId || !hallId) { setError("Cinema data missing. Scan QR code again."); return; }
    setError("");
    setLoading(true);
    startRazorpay();
  };

  return (
    <div className="payment-page">
      <div className="payment-card">
        <p className="payment-label">Checkout Summary</p>
        <h1 className="payment-plan-name">Confirm Order</h1>

        <div className="payment-price-block">
          {/* Total is calculated securely by the backend upon order creation */}
          <span className="payment-amount">Confirming Details...</span>
        </div>

        <p className="plan-note">✦ Screen {screen} • Seat {seat}</p>
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