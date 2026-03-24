import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CustomerCart.css";

const API_BASE = "https://popseat.onrender.com";

const CustomerCart = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const theaterId =
    params.get("theaterId") || localStorage.getItem("customerTheaterId");

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goBack = () => navigate(-1);

  /* ===============================
     LOAD CART
  ================================ */

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

  /* ===============================
     QUANTITY CONTROLS
  ================================ */

  const increaseQty = (id) => {

    const updated = cart.map((item) => {
      const itemId = item.id || item._id;
      return itemId === id
        ? { ...item, quantity: item.quantity + 1 }
        : item;
    });

    updateStorage(updated);

  };

  const decreaseQty = (id) => {

    const updated = cart
      .map((item) => {
        const itemId = item.id || item._id;
        return itemId === id
          ? { ...item, quantity: item.quantity - 1 }
          : item;
      })
      .filter((item) => item.quantity > 0);

    updateStorage(updated);

  };

  const removeItem = (id) => {

    const updated = cart.filter((item) => {
      const itemId = item.id || item._id;
      return itemId !== id;
    });

    updateStorage(updated);

  };

  /* ===============================
     TOTAL
  ================================ */

  const total = cart.reduce((sum, item) => {
    const price = Number(item.finalPrice || item.price || 0);
    return sum + price * item.quantity;
  }, 0);

  /* ===============================
     CHECKOUT — POST /api/order/create
     Flow:
       1. If user NOT logged in → go to login, come back here after
       2. If user IS logged in  → place order directly, then go to payment
  ================================ */

  const handleCheckout = async () => {

    if (cart.length === 0) {
      alert("Your cart is empty");
      return;
    }

    const token = localStorage.getItem("customerToken");

    // ── Not logged in: send to login, return here after ──
    if (!token) {
      // Save current theaterId so login page can redirect back correctly
      if (theaterId) localStorage.setItem("customerTheaterId", theaterId);
      navigate(`/customer/login?theaterId=${theaterId}`);
      return;
    }

    // ── Logged in: place the order ──
    const seatId = localStorage.getItem("customerSeatId");

    if (!seatId) {
      setError("Seat information is missing. Please scan your QR code again.");
      return;
    }

    // Build items array as expected by POST /api/order/create
    const items = cart.map((item) => ({
      menuId: item._id || item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.finalPrice || item.price || 0),
    }));

    const orderPayload = {
      seatId,
      totalAmount: total,
      razorpayOrderId: `order_${Date.now()}`, // temporary; replace with real Razorpay ID after payment
      items,
    };

    setLoading(true);
    setError("");

    try {

      const response = await fetch(`${API_BASE}/api/order/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (data.success) {

        // Save order + payment info for the payment page
        localStorage.setItem("currentOrderId", data.order._id);
        localStorage.setItem(
          "currentPaymentId",
          data.payment?.razorpayOrderId || ""
        );

        // Clear cart after successful order creation
        localStorage.removeItem("cart");
        setCart([]);

        // Go to payment page with theaterId
        navigate(`/payment?theaterId=${theaterId}`);

      } else {
        setError(data.message || "Failed to place order. Please try again.");
      }

    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }

  };

  return (

    <div className="cart-page">

      <div className="cart-container">

        {/* HEADER */}

        <div className="cart-header">

          <button className="back-btn" onClick={goBack}>
            ←
          </button>

          <h2>🛒 My Cart ({cart.length})</h2>

        </div>

        {/* ERROR */}

        {error && (
          <p
            className="error-text"
            style={{ color: "red", fontSize: "13px", margin: "8px 16px" }}
          >
            {error}
          </p>
        )}

        {cart.length === 0 ? (

          <p className="empty-text">Your cart is empty</p>

        ) : (

          cart.map((item) => {

            const itemId = item.id || item._id;

            return (

              <div key={itemId} className="cart-card">

                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-img"
                  />
                )}

                <div className="cart-info">

                  <h3>{item.name}</h3>

                  {item.size && (
                    <p className="cart-meta">Size: {item.size}</p>
                  )}

                  <p className="cart-price">
                    ₹ {item.finalPrice || item.price} × {item.quantity}
                  </p>

                </div>

                <div className="cart-controls">

                  <button
                    className="minus-btn"
                    onClick={() => decreaseQty(itemId)}
                    disabled={loading}
                  >
                    -
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    className="plus-btn"
                    onClick={() => increaseQty(itemId)}
                    disabled={loading}
                  >
                    +
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => removeItem(itemId)}
                    disabled={loading}
                  >
                    🗑
                  </button>

                </div>

              </div>

            );

          })

        )}

      </div>

      {/* FOOTER */}

      <div className="cart-footer">

        <h3>Total: ₹ {total}</h3>

        <button
          className="checkout-btn"
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
        >
          {loading ? "Placing Order..." : "Proceed to Checkout"}
        </button>

      </div>

    </div>

  );

};

export default CustomerCart;