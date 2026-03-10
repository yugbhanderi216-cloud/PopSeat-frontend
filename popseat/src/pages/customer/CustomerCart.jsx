import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CustomerCart.css";

const CustomerCart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const theaterId =
    params.get("theaterId") || localStorage.getItem("customerTheaterId");

  const [cart, setCart] = useState([]);

  const goBack = () => navigate(-1);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);
  }, []);

  const updateStorage = (updated) => {
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  /* ===============================
     QUANTITY CONTROLS
  =============================== */

  const increaseQty = (id) => {
    const updated = cart.map((item) =>
      item.id === id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
    updateStorage(updated);
  };

  const decreaseQty = (id) => {
    const updated = cart
      .map((item) =>
        item.id === id
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
      .filter((item) => item.quantity > 0);

    updateStorage(updated);
  };

  const removeItem = (id) => {
    const updated = cart.filter((item) => item.id !== id);
    updateStorage(updated);
  };

  /* ===============================
     TOTAL
  =============================== */

  const total = cart.reduce(
    (sum, item) => sum + Number(item.finalPrice) * item.quantity,
    0
  );

  /* ===============================
     CHECKOUT
  =============================== */

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Your cart is empty");
      return;
    }

    navigate(`/customer/login?theaterId=${theaterId}`);
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

        {cart.length === 0 ? (
          <p className="empty-text">Your cart is empty</p>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="cart-card">

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
                  <p className="cart-meta">
                    Size: {item.size}
                  </p>
                )}

                <p className="cart-price">
                  ₹ {item.finalPrice} × {item.quantity}
                </p>
              </div>

              <div className="cart-controls">

                <button
                  className="minus-btn"
                  onClick={() => decreaseQty(item.id)}
                >
                  -
                </button>

                <span>{item.quantity}</span>

                <button
                  className="plus-btn"
                  onClick={() => increaseQty(item.id)}
                >
                  +
                </button>

                <button
                  className="delete-btn"
                  onClick={() => removeItem(item.id)}
                >
                  🗑
                </button>

              </div>

            </div>
          ))
        )}

      </div>

      {/* FOOTER */}

      <div className="cart-footer">

        <h3>Total: ₹ {total}</h3>

        <button
          className="checkout-btn"
          onClick={handleCheckout}
        >
          Proceed to Checkout
        </button>

      </div>

    </div>
  );
};

export default CustomerCart;