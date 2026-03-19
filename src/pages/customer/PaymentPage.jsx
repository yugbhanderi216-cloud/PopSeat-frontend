import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PaymentPage.css";

const API_BASE = "https://popseat.onrender.com/api";

const PaymentPage = () => {

  const navigate = useNavigate();
  const location = useLocation();

  const [cart, setCart] = useState([]);
  const [method, setMethod] = useState("razorpay");

  const params = new URLSearchParams(location.search);

  const seatId = params.get("seatId") || localStorage.getItem("seatId");

  useEffect(() => {

    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);

  }, []);

  /* ===============================
     TOTAL
  =============================== */

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  /* ===============================
     CREATE ORDER API
  =============================== */

  const createOrder = async (paymentId) => {

    try {

      const items = cart.map((item) => ({
        menuId: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const res = await fetch(`${API_BASE}/order/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          seatId,
          totalAmount: total,
          razorpayOrderId: paymentId,
          items
        })
      });

      const data = await res.json();

      if (data.success) {

        localStorage.setItem("orderId", data.order?._id || "");
        localStorage.removeItem("cart");

        navigate("/tracking");

      }

    } catch (err) {

      console.error("Order create error:", err);

    }

  };

  /* ===============================
     RAZORPAY
  =============================== */

  const startRazorpay = () => {

    const options = {

      key: "YOUR_RAZORPAY_KEY_ID",

      amount: total * 100,
      currency: "INR",
      name: "PopSeat Cinema",
      description: "Food Order Payment",

      handler: function (response) {

        createOrder(response.razorpay_order_id);

      },

      theme: {
        color: "#b5633c"
      }

    };

    const rzp = new window.Razorpay(options);

    rzp.open();

  };

  /* ===============================
     DIRECT UPI
  =============================== */

  const startUPIIntent = () => {

    const upiId = "yourupi@okhdfcbank";

    const link =
      `upi://pay?pa=${upiId}&pn=PopSeat&am=${total}&cu=INR`;

    window.location.href = link;

    setTimeout(() => createOrder("UPI_MANUAL"), 4000);

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

            <div key={item._id} className="summary-item">

              <span>{item.name} × {item.quantity}</span>

              <span>₹ {item.price * item.quantity}</span>

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