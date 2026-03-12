import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CustomerItemDetails.css";

const CustomerItemDetails = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const item = state?.item;

  if (!item) return <h2 style={{ padding: 20 }}>Item Not Found</h2>;

  const sizeOptions =
    item.sizes && item.sizes.length > 0
      ? item.sizes
      : [{ name: "Regular", price: item.price }];

  const toppingOptions = item.availableToppings || [];
  const dipOptions = item.availableDips || [];

  const [selectedSize, setSelectedSize] = useState(sizeOptions[0]);
  const [qty, setQty] = useState(1);
  const [toppings, setToppings] = useState([]);
  const [dips, setDips] = useState([]);

  const goBack = () => navigate(-1);

  const toggleTopping = (top) => {
    setToppings((prev) =>
      prev.find((t) => t.name === top.name)
        ? prev.filter((t) => t.name !== top.name)
        : [...prev, top]
    );
  };

  const toggleDip = (dip) => {
    setDips((prev) =>
      prev.find((d) => d.name === dip.name)
        ? prev.filter((d) => d.name !== dip.name)
        : [...prev, dip]
    );
  };

  const singleItemPrice =
    Number(selectedSize.price) +
    toppings.reduce((sum, t) => sum + Number(t.price), 0) +
    dips.reduce((sum, d) => sum + Number(d.price), 0);

  const totalPrice = singleItemPrice * qty;

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    const newItem = {
      id: Date.now(),
      name: item.name,
      image: item.image,
      size: selectedSize.name,
      toppings: toppings.map((t) => t.name),
      dips: dips.map((d) => d.name),
      quantity: qty,
      finalPrice: singleItemPrice,
    };

    cart.push(newItem);
    localStorage.setItem("cart", JSON.stringify(cart));
    navigate(-1);
  };

  return (
    <div className="item-page">

      {/* HEADER */}
      <div className="item-header">
        <button className="back-btn" onClick={goBack}>
          ← 
        </button>
      </div>

      <div className="item-wrapper">

        <div className="item-top">
          <img src={item.image} alt={item.name} className="item-image" />

          <div className="item-details">
            <h1 className="item-title">{item.name}</h1>
            <p className="item-desc">{item.description}</p>
            <div className="base-price">₹ {singleItemPrice}</div>
          </div>
        </div>

        <div className="section">
          <h3>Select Size</h3>
          <div className="size-options">
            {sizeOptions.map((s, i) => (
              <button
                key={i}
                className={`size-btn ${
                  selectedSize.name === s.name ? "active" : ""
                }`}
                onClick={() => setSelectedSize(s)}
              >
                {s.name} — ₹{s.price}
              </button>
            ))}
          </div>
        </div>

        {toppingOptions.length > 0 && (
          <div className="section">
            <h3>Add Toppings</h3>
            {toppingOptions.map((top, i) => (
              <div key={i} className="option-row">
                <label>
                  <input type="checkbox" onChange={() => toggleTopping(top)} />
                  {top.name}
                </label>
                <span>+₹{top.price}</span>
              </div>
            ))}
          </div>
        )}

        {dipOptions.length > 0 && (
          <div className="section">
            <h3>Add Dips</h3>
            {dipOptions.map((dip, i) => (
              <div key={i} className="option-row">
                <label>
                  <input type="checkbox" onChange={() => toggleDip(dip)} />
                  {dip.name}
                </label>
                <span>+₹{dip.price}</span>
              </div>
            ))}
          </div>
        )}

        <div className="section">
          <h3>Quantity</h3>
          <div className="qty-box">
            <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
            <span className="qty-number">{qty}</span>
            <button className="qty-btn" onClick={() => setQty(qty + 1)}>+</button>
          </div>
        </div>

      </div>

      <div className="add-cart-bar">
        <div className="total-price">₹ {totalPrice}</div>
        <button className="add-btn" onClick={addToCart}>
          Add To Cart
        </button>
      </div>

    </div>
  );
};

export default CustomerItemDetails;