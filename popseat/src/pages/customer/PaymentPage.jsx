import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PaymentPage.css";

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState("razorpay");

  const params = new URLSearchParams(location.search);
  const theaterIdFromQR = params.get("theaterId");

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);

    if (theaterIdFromQR) {
      localStorage.setItem("customerTheaterId", theaterIdFromQR);
    }
  }, [theaterIdFromQR]);

  /* ===============================
     TOTAL
  =============================== */
  const total = cart.reduce(
    (sum, item) => sum + Number(item.finalPrice) * item.quantity,
    0
  );

  /* ===============================
     SAVE ORDER
  =============================== */
  const saveOrder = (paymentId) => {
    const orderId = "ORD" + Math.floor(Math.random() * 1000000);

    const screenNo = localStorage.getItem("screenNo");
    const seatNo = localStorage.getItem("seatNo");
    const theaterId = Number(localStorage.getItem("customerTheaterId"));

    const newOrder = {
      id: orderId,
      theaterId,
      items: cart,
      total,
      paymentId,
      paymentMethod: method,
      status: "Preparing",
      screenNo,
      seatNo,
      createdAt: new Date().toLocaleString(),
    };

    const existingOrders =
      JSON.parse(localStorage.getItem("orders")) || [];

    localStorage.setItem(
      "orders",
      JSON.stringify([...existingOrders, newOrder])
    );

    localStorage.setItem("orderId", orderId);
    localStorage.removeItem("cart");

    navigate("/tracking");
  };

  /* ===============================
     RAZORPAY
  =============================== */
  const startRazorpay = () => {
    const options = {
      key: "YOUR_RAZORPAY_KEY_ID",
      amount: total * 100,
      currency: "INR",
      name: "Cinema Snacks",
      description: "Food Order Payment",

      handler: function (response) {
        saveOrder(response.razorpay_payment_id);
      },

      theme: {
        color: "#b5633c",
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  /* ===============================
     DIRECT UPI
  =============================== */
  const startUPIIntent = () => {
    const upiId = "yourupi@okhdfcbank";
    const name = "Cinema Snacks";

    const link =
      `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${total}&cu=INR`;

    window.location.href = link;

    setTimeout(() => saveOrder("UPI_MANUAL"), 4000);
  };

  const handlePayment = () => {
    if (method === "razorpay") startRazorpay();
    else startUPIIntent();
  };

  return (
    <div className="payment-page">

      <h2 className="payment-title">Complete Payment</h2>

      <div className="payment-layout">

        {/* ORDER SUMMARY */}
        <div className="summary-box">
          <h3>Order Summary</h3>

          {cart.map((item) => (
            <div key={item.id} className="summary-item">
              <span>{item.name} × {item.quantity}</span>
              <span>₹ {item.finalPrice * item.quantity}</span>
            </div>
          ))}

          <div className="summary-total">
            Total: ₹ {total}
          </div>
        </div>

        {/* PAYMENT METHOD */}
        <div className="method-box">
          <h3>Select Payment Method</h3>

          <label>
            <input
              type="radio"
              value="razorpay"
              checked={method === "razorpay"}
              onChange={() => setMethod("razorpay")}
            />
            Pay via UPI / Paytm / PhonePe / Cards
          </label>

          <label>
            <input
              type="radio"
              value="upi"
              checked={method === "upi"}
              onChange={() => setMethod("upi")}
            />
            Direct UPI App
          </label>
        </div>

      </div>

      <div className="pay-container">
        <button className="pay-btn" onClick={handlePayment}>
          Pay ₹ {total}
        </button>
      </div>

    </div>
  );
};

export default PaymentPage;