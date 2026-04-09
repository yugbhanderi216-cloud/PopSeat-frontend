import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CustomerCart.css";

// ─────────────────────────────────────────────────────────────
//  CustomerCart — shows cart items, quantity controls, total.
//
//  Checkout flow (fixed):
//    1. Not logged in → redirect to /customer/login, return after
//    2. Logged in     → validate seat, then navigate to /payment
//                       PaymentPage creates the order AFTER
//                       getting a real Razorpay order ID.
//
//  FIX: removed POST /api/order/create from this file entirely.
//  Previously this called order/create with razorpayOrderId:
//  `order_${Date.now()}` (a fake ID) before payment happened,
//  AND PaymentPage called it again — creating duplicate orders
//  with a garbage razorpayOrderId stored against real records.
//  Order creation now lives only in PaymentPage.jsx.
// ─────────────────────────────────────────────────────────────

const CustomerCart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params   = new URLSearchParams(location.search);

  const theaterId =
    params.get("theaterId") || localStorage.getItem("theaterId") || "";

  const [cart,    setCart]    = useState([]);
  const [error,   setError]   = useState("");

  const goBack = () => navigate(-1);

  /* ── Currency formatter ── */
  const formatCurrency = (amount) => `₹ ${Number(amount || 0).toFixed(2)}`;

  /* ── Load cart from localStorage ── */
  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(savedCart);
    } catch {
      setCart([]);
    }
  }, []);

  const updateStorage = (updated) => {
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  /* ── Quantity controls ── */
  const increaseQty = (id) => {
    updateStorage(
      cart.map((item) =>
        (item.id || item._id) === id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQty = (id) => {
    updateStorage(
      cart
        .map((item) =>
          (item.id || item._id) === id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id) => {
    updateStorage(cart.filter((item) => (item.id || item._id) !== id));
  };

  /* ── Total Calculation ── */
  const totalAmount = cart.reduce((acc, item) => {
    const price = item.finalPrice || item.price || 0;
    return acc + (item.quantity * price);
  }, 0);

  /* ── Checkout ── */
  const handleCheckout = () => {
    setError("");

    if (cart.length === 0) {
      alert("Your cart is empty");
      return;
    }

    const seatId = localStorage.getItem("seatId");

    // Seat context is mandatory for cinema ordering
    if (!seatId) {
      setError("Seat information is missing. Please scan your QR code again.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      const paymentUrl = `/payment?theaterId=${theaterId}`;
      navigate(`/customer/login?theaterId=${theaterId}&redirect=${encodeURIComponent(paymentUrl)}`);
      return;
    }

    // All good — hand off to PaymentPage
    navigate(`/payment?theaterId=${theaterId}`);
  };

  /* ── Render ── */
  return (
    <div className="cart-page">
      <div className="cart-container">

        {/* Header */}
        <div className="cart-header">
          <button className="back-btn" onClick={goBack}>←</button>
          <h2>🛒 My Cart ({cart.length})</h2>
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: "red", fontSize: "13px", margin: "8px 16px" }}>
            {error}
          </p>
        )}

        {/* Cart items */}
        {cart.length === 0 ? (
          <p className="empty-text">Your cart is empty</p>
        ) : (
          cart.map((item) => {
            const itemId = item.id || item._id;
            return (
              <div key={itemId} className="cart-card">
                {/* Delete — top-right floating */}
                <button className="delete-btn" onClick={() => removeItem(itemId)}>🗑</button>

                {item.image && (
                  <img src={item.image} alt={item.name} className="cart-img" />
                )}
                <div className="cart-info">
                  <h3>{item.name}</h3>
                  {item.size && <p className="cart-meta">Size: {item.size}</p>}

                  {/* Quantity pill — below item info */}
                  <div className="cart-controls">
                    <button className="minus-btn" onClick={() => decreaseQty(itemId)}>−</button>
                    <span>{item.quantity}</span>
                    <button className="plus-btn"  onClick={() => increaseQty(itemId)}>+</button>
                  </div>
                </div>
                
                <div className="cart-price-container">
                  <p className="cart-item-total">
                    {item.quantity} × {formatCurrency(item.finalPrice || item.price || 0)}
                  </p>
                  <p className="cart-price">
                    {formatCurrency(item.quantity * (item.finalPrice || item.price || 0))}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="cart-footer">
        <h3>
          Total Bill <span>{formatCurrency(totalAmount)}</span>
        </h3>
        <button
          className="checkout-btn"
          onClick={handleCheckout}
          disabled={cart.length === 0}
        >
          <span>Proceed to Checkout</span>
        </button>
      </div>
    </div>
  );
};

export default CustomerCart;
