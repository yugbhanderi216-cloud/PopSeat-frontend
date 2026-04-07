import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PaymentPage.css";

const API_BASE = "https://popseat.onrender.com/api";
const RAZORPAY_KEY = "rzp_test_STsZnqsQOPRrqZ";

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const seatId = params.get("seatId") || localStorage.getItem("customerSeatId");
  const theaterId = localStorage.getItem("customerTheaterId") || localStorage.getItem("theaterId") || "";
  const hallId = params.get("hallId") || localStorage.getItem("customerHallId") || localStorage.getItem("hallId") || "";
  const screen = localStorage.getItem("screenNo") || "";
  const seat = localStorage.getItem("seatNo") || "";

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

  const total = cart.reduce(
    (sum, item) => sum + Number(item.finalPrice || item.price || 0) * item.quantity,
    0
  );

  const authHeaders = () => {
    const token = localStorage.getItem("token") || "";
    const sessionId = localStorage.getItem("sessionId") || "";
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(sessionId && { "session-id": sessionId })
    };
  };

  const createFoodOrder = async () => {
    const items = cart.map((item) => ({
      menuId: item.menuId || item._id || item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.finalPrice || item.price || 0),
    }));

    const res = await fetch(`${API_BASE}/order`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        theaterId: theaterId,
        seatNumber: seat || seatId || "Unknown",
        hallId: hallId || "Unknown",
        totalAmount: total,
        items,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Order creation failed.");
    return data;
  };

  const verifyPayment = async (paymentId) => {
    const res = await fetch(`${API_BASE}/payment/verify`, {
      method: "POST",
      headers: authHeaders(),
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
      const orderData = await createFoodOrder();
      
      const internalOrderId = orderData.order?._id;
      const internalPaymentId = orderData.payment?._id;
      const rzpOrderId = orderData.payment?.razorpayOrderId;

      const options = {
        key: RAZORPAY_KEY,
        amount: total * 100,
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
            navigate(`/tracking?theaterId=${theaterId}&screen=${screen}&seat=${seat}&hallId=${hallId}&seatId=${seatId}`);
          } catch (verifyErr) {
            setError(verifyErr.message || "Payment verification failed.");
            setLoading(false);
          }
        },
        theme: { color: "#6C63FF" },
        modal: { ondismiss: () => { setLoading(false); setError("Payment cancelled by user."); } },
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
          <span className="payment-currency">₹</span>
          <span className="payment-amount">{total.toLocaleString("en-IN")}</span>
        </div>

        <p className="plan-note">✦ Screen {screen} • Seat {seat}</p>
        <div className="payment-divider" />

        <div className="customer-order-list">
          {cart.map((item, i) => (
            <div key={item.cartKey || item._id || i} className="customer-order-item">
              <span className="item-name">
                {item.name}{item.size ? ` (${item.size})` : ""} × {item.quantity}
              </span>
              <span className="item-price">
                ₹ {Number(item.finalPrice || item.price || 0) * item.quantity}
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
            `Pay ₹${total.toLocaleString("en-IN")}`
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
