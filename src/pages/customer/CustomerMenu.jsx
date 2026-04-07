import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CustomerMenu.css";

const API_BASE = "https://popseat.onrender.com";

const sessionId = localStorage.getItem("sessionId");

const getImageUrl = (url) => {
  if (!url) return "";
  // Force https to prevent Mixed Content errors on HTTPS deployments
  if (url.startsWith("http://")) url = url.replace("http://", "https://");
  if (url.startsWith("data:") || url.startsWith("https://") || url.startsWith("blob:")) return url;
  return `${API_BASE}/${url.replace(/^\//, "")}`;
};

const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const CustomerMenu = () => {

  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);

  const theaterId = params.get("theaterId") || localStorage.getItem("theaterId") || "";
  const hallId    = params.get("hallId") || localStorage.getItem("hallId") || "";
  const seatId    = params.get("seatId") || localStorage.getItem("seatId") || "";
  const seatNo    = params.get("seat") || localStorage.getItem("seatNo") || "";
  const screenNo  = params.get("screen") || localStorage.getItem("screenNo") || "";
  const type      = params.get("type") || localStorage.getItem("seatType");

  const [theater, setTheater] = useState(null);
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
    if (theaterId) localStorage.setItem("theaterId", theaterId);
    if (hallId)    localStorage.setItem("hallId", hallId);
    if (seatId)    localStorage.setItem("seatId", seatId);
    if (seatNo)    localStorage.setItem("seatNo", seatNo);
    if (screenNo)  localStorage.setItem("screenNo", screenNo);
  }, [theaterId, hallId, seatId, seatNo, screenNo]);

  /* ================= LOAD THEATER DETAILS ================= */
  useEffect(() => {
    const fetchTheater = async () => {
      if (!theaterId) return;
      try {
        const res = await fetch(`${API_BASE}/api/cinema/${theaterId}`);
        const data = await res.json();
        if (data.success && data.cinema) {
          setTheater(data.cinema);
        }
      } catch (err) {
        console.error("Theater fetch failed:", err);
      }
    };
    fetchTheater();
  }, [theaterId]);

  /* ================= LOAD CATEGORIES (Derive from items) ================= */
  // We derive categories from the theater-specific items to ensure 
  // users only see categories that have items in the current theater.
  const syncCategories = (menuItems) => {
    if (!menuItems || !menuItems.length) return;
    const uniqueCats = [...new Set(menuItems.map(i => 
      typeof i.category === 'string' ? i.category : i.category?.name
    ))].filter(Boolean);
    
    setCategories(uniqueCats);
    if (uniqueCats.length > 0 && !activeCategory) {
      setActiveCategory(uniqueCats[0]);
    }
  };

  /* ================= LOAD MENU (Scoped to Theater) ================= */
  useEffect(() => {
    const fetchMenu = async () => {
      const targetTheaterId = params.get("theaterId") || theaterId;
      
      // Security Guard: Prevent fetching if no theater identified
      if (!targetTheaterId) {
        console.warn("No theater ID found. Redirecting to Welcome...");
        navigate("/customer/welcome");
        return;
      }

      setMenuLoading(true);
      setCategoryLoading(true);
      
      try {
        // Scoped Backend Endpoint (Isolation-Aware)
        const url = `${API_BASE}/api/customer/theaters/${targetTheaterId}/menu`;
        const res = await fetch(url, { headers: { "session-id": sessionId } });

        // Handle error states (e.g. theater not found or session expired)
        if (res.status === 401 || res.status === 403) {
          navigate(`/customer/welcome?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}`);
          return;
        }

        const data = await res.json();
        if (data.success && data.menu) {
          const availableItems = (data.menu || []).filter(
            (item) => item.available !== false && !item.isDeleted
          );
          setItems(availableItems);
          syncCategories(availableItems);
        }
      } catch (error) {
        console.log("Menu isolation error:", error);
      } finally {
        setMenuLoading(false);
        setCategoryLoading(false);
      }
    };
    fetchMenu();
  }, [theaterId]);

  /* ================= LOAD CART (With Multi-Theater Isolation) ================= */
  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      const cartTheater = localStorage.getItem("cartTheaterId");

      // Isolation Guard: If the cart belongs to a different theater, clear it.
      if (cartTheater && cartTheater !== theaterId && savedCart.length > 0) {
        console.warn("Cart theater mismatch detected. Clearing cart for isolation.");
        localStorage.removeItem("cart");
        setCart([]);
      } else {
        setCart(savedCart);
      }
    } catch {
      setCart([]);
    }
  }, [theaterId]);

  /* ================= SAVE CART ================= */
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  /* ================= FILTERED ITEMS ================= */
  const filteredItems = items.filter((i) => i.category === activeCategory);

  /* ================= CART TOTALS ================= */
  const cartTotalQty = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const cartTotalPrice = cart.reduce(
    (sum, item) => sum + (Number(item.finalPrice || item.price || 0)) * (item.quantity || 0),
    0
  );

  const isLoading = menuLoading || categoryLoading;

  return (
    <div className="customer-menu-page">
      <div className="menu-wrapper">

        {/* ─── HEADER ─── */}
        <header className="customer-header">

          <button className="back-btn" onClick={goBack} aria-label="Go back">
            ←
          </button>

          <div className="header-info">
            <h1 className="header-title">{theater?.name || "Order Food"}</h1>
            <p className="header-details">
              Delivering to: Screen {screenNo || "1"} • Seat {seatNo || "---"}
            </p>
          </div>

          <button
            className="cart-btn"
            onClick={() =>
              navigate(
                `/customer/cart?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}`
              )
            }
            aria-label={`View cart with ${cartTotalQty} items`}
          >
            🛒
            <span className="cart-count-badge">{cartTotalQty}</span>
          </button>

        </header>

        {/* ─── CATEGORY TABS ─── */}
        <nav className="category-tabs">
          {categoryLoading ? (
            <span className="loading-txt">Loading categories…</span>
          ) : (
            categories.map((cat) => (
              <button
                key={cat}
                className={activeCategory === cat ? "active-tab" : ""}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))
          )}
        </nav>

        {/* ─── FOOD DISPLAY ─── */}
        <section className="food-section">
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
              {filteredItems.map((item, index) => {
                const isFeatured = index === 0;
                return (
                  <article
                    key={item._id}
                    className={`customer-card ${isFeatured ? "featured-card" : "standard-card"}`}
                    onClick={() =>
                      navigate("/customer/item", {
                        state: { item, theaterId, hallId, seatId },
                      })
                    }
                  >

                    {/* Image Section */}
                    {item.image && (
                      <div className="item-image-wrap">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="food-img"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                        {isFeatured && <div className="veg-badge" />}
                      </div>
                    )}

                    {/* Content Section */}
                    <div className="card-content">
                      <h2 className="item-name">{item.name}</h2>

                      {/* Full Info (Desktop) */}
                      <div className="full-info">
                        {item.description && (
                          <p className="item-desc">{item.description}</p>
                        )}
                        <div className="all-prices">
                          {ensureArray(item.variants).length > 0 ? (
                            item.variants.map((v, i) => (
                              <span key={i} className="variant-tag">
                                {v.size}
                              </span>
                            ))
                          ) : (
                            null
                          )}
                        </div>
                      </div>

                      <div className="compact-info">
                        {/* Price hidden as requested */}
                      </div>

                      <div className="item-price">
                        ₹{ensureArray(item.variants).length > 0 ? (item.variants[0].price || 0) : (item.price || 0)}
                      </div>

                      <div className="item-cta-btn">
                        Order now
                      </div>
                    </div>

                  </article>
                );
              })}
            </div>
          )}
        </section>

      </div>

      {/* ─── BOTTOM CART BAR ─── */}
      {cartTotalQty > 0 && (
        <div
          className="bottom-cart-bar"
          onClick={() =>
            navigate(
              `/customer/cart?theaterId=${theaterId}&hallId=${hallId}&seatId=${seatId}`
            )
          }
        >
          <div className="cart-bar-left">
            <span className="cart-bar-amount">₹ {cartTotalPrice}</span>
            <span className="cart-bar-items">{cartTotalQty} item{cartTotalQty !== 1 ? "s" : ""}</span>
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
