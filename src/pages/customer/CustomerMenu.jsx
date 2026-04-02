import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CustomerMenu.css";

const API_BASE = "https://popseat.onrender.com";

const getImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_BASE}/${url.replace(/^\//, "")}`;
};

const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const CustomerMenu = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);

  const theaterId =
    params.get("theaterId") || localStorage.getItem("customerTheaterId");

  const screen =
    params.get("screen") || localStorage.getItem("screenNo");

  const seat =
    params.get("seat") || localStorage.getItem("seatNo");

  const type =
    params.get("type") || localStorage.getItem("seatType");

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);

  /* 🔙 GO BACK */
  const goBack = () => navigate(-1);

  /* ================= SAVE INFO ================= */
  useEffect(() => {
    const cinemaId = params.get("cinemaId");
    const hallId = params.get("hall");
    const seatId = params.get("seat");

    if (screen) localStorage.setItem("screenNo", screen);
    if (seat) localStorage.setItem("seatNo", seat);
    if (theaterId) localStorage.setItem("customerTheaterId", theaterId);
    if (type) localStorage.setItem("seatType", type);
    if (cinemaId) localStorage.setItem("customerTheaterId", cinemaId);
    if (hallId) localStorage.setItem("customerHallId", hallId);
    if (seatId) localStorage.setItem("customerSeatId", seatId);
  }, [screen, seat, theaterId, type]);

  /* ================= LOAD CATEGORIES ================= */
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoryLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/category`);
        const data = await res.json();

        if (data.success && data.categories.length > 0) {
          const categoryNames = data.categories.map((cat) =>
            typeof cat === "string" ? cat : cat.name
          );
          setCategories(categoryNames);
          setActiveCategory(categoryNames[0]);
        }
      } catch (error) {
        console.log("Category fetch error:", error);
      } finally {
        setCategoryLoading(false);
      }
    };
    fetchCategories();
  }, []);

  /* ================= LOAD MENU ================= */
  useEffect(() => {
    const fetchMenu = async () => {
      setMenuLoading(true);
      try {
        const activeCinemaId = params.get("cinemaId") || theaterId;
        const url = activeCinemaId
          ? `${API_BASE}/api/menu?cinemaId=${activeCinemaId}`
          : `${API_BASE}/api/menu`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
          const availableItems = data.menu.filter(
            (item) => item.available !== false && !item.isDeleted
          );
          setItems(availableItems);

          setCategories((prev) => {
            if (prev.length > 0) return prev;
            const derived = [...new Set(availableItems.map((i) => i.category))];
            if (derived.length > 0 && !activeCategory) setActiveCategory(derived[0]);
            return derived;
          });
        }
      } catch (error) {
        console.log("Menu fetch error:", error);
      } finally {
        setMenuLoading(false);
      }
    };
    fetchMenu();
  }, []);

  /* ================= LOAD CART ================= */
  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(savedCart);
    } catch {
      setCart([]);
    }
  }, []);

  /* ================= SAVE CART ================= */
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  /* ================= FILTERED ITEMS ================= */
  const filteredItems = items.filter((i) => i.category === activeCategory);

  /* ================= CART TOTALS ================= */
  const cartTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotalPrice = cart.reduce(
    (sum, item) => sum + (item.finalPrice || item.price) * item.quantity,
    0
  );

  const isLoading = menuLoading || categoryLoading;

  return (
    <div className="customer-menu-page">
      <div className="menu-wrapper">

        {/* ─── HEADER ─── */}
        <div className="customer-header">

          {/* Back */}
          <button className="back-btn" onClick={goBack} aria-label="Go back">
            ←
          </button>

          {/* Center info */}
          <div className="header-info">
            <div className="header-logo-row">
              <div className="header-icon-wrap">🍿</div>
              <h2>Order Food</h2>
            </div>
            <p>
              Screen {screen}
              <span className="dot" />
              Seat {seat}
            </p>
          </div>

          {/* Cart */}
          <button
            className="cart-btn"
            onClick={() =>
              navigate(
                `/customer/cart?theaterId=${theaterId}&screen=${screen}&seat=${seat}`
              )
            }
            aria-label={`View cart with ${cartTotalQty} items`}
          >
            🛒
            <span className="cart-count-badge">{cartTotalQty}</span>
          </button>

        </div>

        <div className="header-divider" />

        {/* ─── CATEGORY TABS ─── */}
        {categoryLoading ? (
          <div className="category-tabs">
            <span style={{ padding: "8px 0", color: "var(--text-muted)", fontSize: 13 }}>
              Loading categories…
            </span>
          </div>
        ) : (
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={activeCategory === cat ? "active-tab" : ""}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ─── SECTION LABEL ─── */}
        {!isLoading && filteredItems.length > 0 && (
          <p className="menu-section-label">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} available
          </p>
        )}

        {/* ─── FOOD GRID ─── */}
        {menuLoading ? (

          <div className="menu-loading-state">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>

        ) : filteredItems.length === 0 ? (

          <div className="menu-empty-state">
            <div className="empty-icon">🍽️</div>
            <p>No items available in this category</p>
          </div>

        ) : (

          <div className="customer-grid">
            {filteredItems.map((item) => (

              <div
                key={item._id}
                className="customer-card"
                onClick={() =>
                  navigate("/customer/item", {
                    state: { item, theaterId, screen, seat },
                  })
                }
              >

                {/* Image */}
                {item.image && (
                  <div className="img-wrap">
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      className="customer-food-img"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <div className="veg-dot" />
                  </div>
                )}

                {/* Body */}
                <div className="card-body">

                  <h3>{item.name}</h3>

                  {item.description && (
                    <p className="desc">{item.description}</p>
                  )}

                  {/* Size Chips */}
                  <div className="card-variants-container">
                    {ensureArray(item.variants).length > 0 ? (
                      item.variants.map((v, i) => (
                        <span key={i} className="card-size-chip">
                          {v.size} · ₹{v.price}
                        </span>
                      ))
                    ) : (
                      <span className="card-size-chip">₹ {item.price}</span>
                    )}
                  </div>

                  {/* CTA */}
                  <p className="tap-note">
                    Tap to customize ➜
                  </p>

                </div>

              </div>

            ))}
          </div>

        )}

      </div>

      {/* ─── BOTTOM CART BAR ─── */}
      {cartTotalQty > 0 && (
        <div
          className="bottom-cart-bar"
          onClick={() =>
            navigate(
              `/customer/cart?theaterId=${theaterId}&screen=${screen}&seat=${seat}`
            )
          }
        >
          <div className="cart-bar-left">
            <span className="cart-bar-amount">₹ {cartTotalPrice}</span>
            <span className="cart-bar-items">{cartTotalQty} item{cartTotalQty !== 1 ? "s" : ""} in cart</span>
          </div>
          <div className="cart-bar-right">
            View Cart ➜
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerMenu;