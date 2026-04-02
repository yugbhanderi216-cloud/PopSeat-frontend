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
  const [categories, setCategories] = useState([]);   // GET /api/category
  const [activeCategory, setActiveCategory] = useState("");
  const [cart, setCart] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);

  /* 🔙 GO BACK */

  const goBack = () => navigate(-1);

  /* ================= SAVE INFO ================= */

  useEffect(() => {
    const cinemaId = params.get("cinemaId");
    const hallId   = params.get("hall");
    const seatId   = params.get("seat");

    if (screen)    localStorage.setItem("screenNo", screen);
    if (seat)      localStorage.setItem("seatNo", seat);
    if (theaterId) localStorage.setItem("customerTheaterId", theaterId);
    if (type)      localStorage.setItem("seatType", type);
    if (cinemaId)  localStorage.setItem("customerTheaterId", cinemaId);
    if (hallId)    localStorage.setItem("customerHallId", hallId);
    if (seatId)    localStorage.setItem("customerSeatId", seatId);

  }, [screen, seat, theaterId, type]);

  /* ================= LOAD CATEGORIES — GET /api/category ================= */

  useEffect(() => {

    const fetchCategories = async () => {

      setCategoryLoading(true);

      try {

        const res = await fetch(`${API_BASE}/api/category`);
        const data = await res.json();

        if (data.success && data.categories.length > 0) {

          // API returns category objects — extract name for display
          // Shape may be: { _id, name } or just strings — handle both
          const categoryNames = data.categories.map((cat) =>
            typeof cat === "string" ? cat : cat.name
          );

          setCategories(categoryNames);
          setActiveCategory(categoryNames[0]);

        }
        // If API returns empty [], fall back to menu-derived categories
        // (handled after menu loads in the merged useEffect below)

      } catch (error) {
        console.log("Category fetch error:", error);
        // Fallback handled after menu loads
      } finally {
        setCategoryLoading(false);
      }

    };

    fetchCategories();

  }, []);

  /* ================= LOAD MENU — GET /api/menu ================= */

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

          // Fallback: if category API returned empty, derive from menu
          setCategories((prev) => {

            if (prev.length > 0) return prev; // API already gave us categories

            const derived = [...new Set(availableItems.map((i) => i.category))];

            if (derived.length > 0 && !activeCategory) {
              setActiveCategory(derived[0]);
            }

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

  // FIX: show total quantity not unique entry count
  const cartTotalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartTotalPrice = cart.reduce(
    (sum, item) => sum + (item.finalPrice || item.price) * item.quantity,
    0
  );

  /* ================= LOADING STATE ================= */

  const isLoading = menuLoading || categoryLoading;

  return (

    <div className="customer-menu-page">

      <div className="menu-wrapper">

        {/* HEADER */}

        <div className="customer-header">

          <button className="back-btn" onClick={goBack}>
            ←
          </button>

          <div className="header-info">
            <h2>🍿 Order Food</h2>
            <p>Screen {screen} • Seat {seat}</p>
          </div>

          <button
            className="cart-btn"
            onClick={() =>
              navigate(
                `/customer/cart?theaterId=${theaterId}&screen=${screen}&seat=${seat}`
              )
            }
          >
            {/* FIX: show real total quantity */}
            🛒 {cartTotalQty}
          </button>

        </div>

        {/* CATEGORY TABS */}

        {categoryLoading ? (

          <div className="category-tabs">
            <span style={{ padding: "8px 16px", color: "#888" }}>
              Loading categories...
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

        {/* FOOD GRID */}

        {menuLoading ? (

          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#888",
            }}
          >
            Loading menu...
          </div>

        ) : filteredItems.length === 0 ? (

          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#888",
            }}
          >
            No items available in this category
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

                {item.image && (
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name}
                    className="customer-food-img"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}

                <div className="card-body">

                  <h3>{item.name}</h3>

                  <p className="desc">{item.description}</p>

                  {/* Premium Price Pill */}
                  <div className="price-pill-container">
                    <span className="price-pill">
                      {ensureArray(item.variants).length > 1
                        ? `From ₹ ${Math.min(...item.variants.map((v) => v.price))}`
                        : `₹ ${item.price}`}
                    </span>
                  </div>

                  <p className="tap-note">Tap to customize ➜</p>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* BOTTOM CART BAR */}

      {cartTotalQty > 0 && (

        <div
          className="bottom-cart-bar"
          onClick={() =>
            navigate(
              `/customer/cart?theaterId=${theaterId}&screen=${screen}&seat=${seat}`
            )
          }
        >

          <div>
            ₹ {cartTotalPrice} | {cartTotalQty} item(s)
          </div>

          <div>View Cart ➜</div>

        </div>

      )}

    </div>

  );

};

export default CustomerMenu;