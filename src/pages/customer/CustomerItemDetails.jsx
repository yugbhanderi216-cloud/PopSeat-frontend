import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CustomerItemDetails.css";

const API_BASE = "https://popseat.onrender.com";

const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_BASE}/${url.replace(/^\//, "")}`;
};

const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const CustomerItemDetails = () => {

  const { state } = useLocation();
  const navigate = useNavigate();
  const item = state?.item;

  if (!item) return <h2 style={{ padding: 20 }}>Item Not Found</h2>;

  const sizeOptions =
    ensureArray(item.variants).length > 0
      ? item.variants.map((v) => ({ name: v.size || v.name, price: v.price }))
      : ensureArray(item.sizes).length > 0
      ? item.sizes.map((s) => ({ name: s.name || s.size, price: s.price }))
      : [{ name: item.size || "Regular", price: item.price }];

  const toppingOptions = ensureArray(item.availableToppings || item.topping);
  const dipOptions = ensureArray(item.availableDips || item.dips);

  const [selectedSize, setSelectedSize] = useState(sizeOptions[0]);
  const [qty, setQty] = useState(1);
  const [toppings, setToppings] = useState([]);
  const [dips, setDips] = useState([]);

  const goBack = () => navigate(-1);

  /* ================= TOGGLE TOPPING ================= */

  const toggleTopping = (top) => {

    setToppings((prev) =>
      prev.find((t) => t.name === top.name)
        ? prev.filter((t) => t.name !== top.name)
        : [...prev, top]
    );

  };

  /* ================= TOGGLE DIP ================= */

  const toggleDip = (dip) => {

    setDips((prev) =>
      prev.find((d) => d.name === dip.name)
        ? prev.filter((d) => d.name !== dip.name)
        : [...prev, dip]
    );

  };

  /* ================= PRICE CALCULATION ================= */

  const singleItemPrice =
    Number(selectedSize.price) +
    toppings.reduce((sum, t) => sum + Number(t.price || 0), 0) +
    dips.reduce((sum, d) => sum + Number(d.price || 0), 0);

  const totalPrice = singleItemPrice * qty;

  /* ================= ADD TO CART ================= */

  const addToCart = () => {

    let cart = [];

    try {
      cart = JSON.parse(localStorage.getItem("cart")) || [];
    } catch {
      cart = [];
    }

    // Unique cart key: menuId + size + toppings + dips combo
    // This ensures same item with different options = different cart entries
    // and same item with same options = quantity gets merged
    const cartKey = [
      item._id || item.id,
      selectedSize.name,
      toppings.map((t) => t.name).sort().join(","),
      dips.map((d) => d.name).sort().join(","),
    ].join("|");

    const existingIndex = cart.findIndex((c) => c.cartKey === cartKey);

    if (existingIndex !== -1) {

      // Merge quantity if exact same item+options already in cart
      cart[existingIndex].quantity += qty;

    } else {

      const newItem = {
        // FIX: use stable cartKey instead of Date.now()
        // CartCart uses item.id || item._id for qty controls — cartKey goes into id
        id: cartKey,
        cartKey,

        menuId: item._id || item.id,
        _id: item._id || item.id,      // kept for CustomerCart's order payload (menuId lookup)

        name: item.name,
        image: item.image,

        size: selectedSize.name,
        toppings: toppings.map((t) => t.name),
        dips: dips.map((d) => d.name),

        quantity: qty,
        finalPrice: singleItemPrice,
      };

      cart.push(newItem);

    }

    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartTheaterId", state?.theaterId || "");

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

      {/* TOP SECTION: Image (left) + Title, Price, Size (right) */}

      <div className="top-section">

        <div className="item-hero">

          <img
            src={getImageUrl(item.image)}
            alt={item.name}
            className="item-image"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <div className="item-overlay" />

        </div>

        <div className="item-details">

          <div className="title-row">
            <h1 className="item-title">{item.name}</h1>
            <div className="dynamic-price">₹ {selectedSize.price}</div>
          </div>

          <p className="item-desc">{item.description}</p>

          {/* SIZE — lives in top section (right column on desktop) */}

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
                  {s.name}
                </button>

              ))}

            </div>

          </div>

        </div>

      </div>

      {/* BOTTOM SECTION: Full-width toppings, dips, quantity + cart bar */}

      <div className="bottom-section">

        {/* TOPPINGS */}

        {toppingOptions.length > 0 && (

          <div className="section">

            <h3>Add Toppings</h3>

            <div className="options-container">
              {toppingOptions.map((top, i) => {
                const isSelected = !!toppings.find((t) => t.name === top.name);
                return (
                  <div key={i} className={`option-row ${isSelected ? "selected" : ""}`}>
                    <label className="option-label">
                      <div className="option-left">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTopping(top)}
                        />
                        <span className="option-name">{top.name}</span>
                      </div>
                      <span className="option-price">+₹{top.price}</span>
                    </label>
                  </div>
                );
              })}
            </div>

          </div>

        )}

        {/* DIPS */}

        {dipOptions.length > 0 && (

          <div className="section">

            <h3>Add Dips</h3>

            <div className="options-container">
              {dipOptions.map((dip, i) => {
                const isSelected = !!dips.find((d) => d.name === dip.name);
                return (
                  <div key={i} className={`option-row ${isSelected ? "selected" : ""}`}>
                    <label className="option-label">
                      <div className="option-left">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDip(dip)}
                        />
                        <span className="option-name">{dip.name}</span>
                      </div>
                      <span className="option-price">+₹{dip.price}</span>
                    </label>
                  </div>
                );
              })}
            </div>

          </div>

        )}

        {/* QUANTITY */}

        <div className="section">

          <h3>Quantity</h3>

          <div className="qty-box">

            <button
              className="qty-btn"
              onClick={() => setQty(Math.max(1, qty - 1))}
            >
              -
            </button>

            <span className="qty-number">{qty}</span>

            <button
              className="qty-btn"
              onClick={() => setQty(qty + 1)}
            >
              +
            </button>

          </div>

        </div>

        {/* ADD TO CART — static inside bottom-section on desktop */}

        <div className="add-cart-bar">

          <div className="total-price">₹ {totalPrice}</div>

          <button className="add-btn" onClick={addToCart}>
            Add To Cart
          </button>

        </div>

      </div>

    </div>

  );

};

export default CustomerItemDetails;
