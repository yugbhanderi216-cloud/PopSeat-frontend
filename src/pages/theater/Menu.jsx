import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Menu.css";

// APIs USED:
//   GET    /api/menu         ✅ confirmed
//   POST   /api/menu         ✅ confirmed
//   PUT    /api/menu/:id     ✅ confirmed
//   DELETE /api/menu/:id     ✅ confirmed
//
// IMAGE HANDLING:
//   Backend now uses multer for image uploads.
//   Images are sent via FormData using the "image" field as a File object.
//   Base64 compression has been removed from the frontend.
//
// ⚠️  500 ERROR ON GET /api/menu:
//   This is a backend issue — the server is crashing when fetching menu.
//   Check backend logs. Common causes:
//     - DB connection issue
//     - Unhandled schema error (missing field, bad ObjectId, etc.)
//   Frontend now handles the 500 gracefully and shows a clear message.

const API_BASE = "https://popseat.onrender.com/api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization : `Bearer ${
    localStorage.getItem("ownerToken") || localStorage.getItem("token") || ""
  }`,
});

const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

// FIX: Category — first letter always capital, rest lowercase per word
const capitalizeCategory = (text) => {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\w/g, (c) => c.toUpperCase());
};

const capitalizeWords = (text) =>
  (text || "").replace(/\b\w/g, (c) => c.toUpperCase());

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES   = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EMPTY_FORM = { name: "", description: "", category: "", image: "", imageFile: null };

const Menu = () => {
  const activeTheaterId = 
    localStorage.getItem("activeOwnerTheaterId") || 
    localStorage.getItem("assignedTheaterId") || 
    "";

  const [items,        setItems]        = useState([]);
  const [showModal,    setShowModal]    = useState(false);
  const [editId,       setEditId]       = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [sizes,        setSizes]        = useState([]);
  const [toppings,     setToppings]     = useState([]);
  const [dips,         setDips]         = useState([]);
  const [tempSize,     setTempSize]     = useState({ name: "", price: "" });
  const [tempTopping,  setTempTopping]  = useState({ name: "", price: "" });
  const [tempDip,      setTempDip]      = useState({ name: "", price: "" });
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [imgError,     setImgError]     = useState("");
  const [confirmDel,   setConfirmDel]   = useState(null);
  const fileInputRef = useRef(null);

  /* ═══════════════════════════════════
     GET /api/menu ✅
     ⚠️ 500 error = backend crash — handled gracefully
  ═══════════════════════════════════ */
  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = activeTheaterId 
        ? `${API_BASE}/menu?cinemaId=${activeTheaterId}`
        : `${API_BASE}/menu`;
        
      const res  = await fetch(url, { headers: authHeaders() });

      // ⚠️ Handle 500 server error explicitly
      if (res.status === 500) {
        setError("Server error (500) — the backend crashed while loading the menu. Please check your backend logs and try again.");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.success) {
        const cleaned = (data.menu || [])
          .filter((item) => !item.isDeleted)
          .map((item) => ({
            id               : item._id,
            _id              : item._id,
            name             : item.name,
            description      : item.description || "",
            // FIX: Always capitalize category correctly
            category         : capitalizeCategory(item.category || "Others"),
            image            : item.image || "",
            sizes            : [{ name: item.size || "Regular", price: item.price }],
            availableToppings: ensureArray(item.topping),
            availableDips    : ensureArray(item.dips),
            isAvailable      : item.available !== false,
          }));
        setItems(cleaned);
        if (!cleaned.length) setError("");
      } else {
        setError(data.message || "Failed to load menu.");
      }
    } catch (err) {
      console.error("Menu API error:", err);
      setError("Network error — could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  /* ═══════════════════════════════════
     IMAGE UPLOAD — Multer Ready
     Validates file type + size,
     stores File object in form.imageFile and creates preview URL
  ═══════════════════════════════════ */
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImgError("");

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImgError("Only JPG, PNG, WebP, or GIF files are allowed.");
      e.target.value = "";
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setImgError(`File too large. Max ${MAX_FILE_SIZE_MB}MB allowed.`);
      e.target.value = "";
      return;
    }

    if (form.imageFile) URL.revokeObjectURL(form.image);
    
    setForm((prev) => ({ 
      ...prev, 
      imageFile: file, 
      image: URL.createObjectURL(file) 
    }));
    e.target.value = "";
  };

  const removeImage = () => {
    if (form.imageFile) URL.revokeObjectURL(form.image);
    setForm((prev) => ({ ...prev, image: "", imageFile: null }));
    setImgError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Size / topping / dip helpers ── */
  const addSize = () => {
    if (!tempSize.name.trim() || !tempSize.price) return;
    setSizes([...sizes, { name: capitalizeWords(tempSize.name), price: Number(tempSize.price) }]);
    setTempSize({ name: "", price: "" });
  };
  const removeSize    = (i) => setSizes(sizes.filter((_, idx) => idx !== i));

  const addTopping = () => {
    if (!tempTopping.name.trim() || !tempTopping.price) return;
    setToppings([...toppings, { name: capitalizeWords(tempTopping.name), price: Number(tempTopping.price) }]);
    setTempTopping({ name: "", price: "" });
  };
  const removeTopping = (i) => setToppings(toppings.filter((_, idx) => idx !== i));

  const addDip = () => {
    if (!tempDip.name.trim() || !tempDip.price) return;
    setDips([...dips, { name: capitalizeWords(tempDip.name), price: Number(tempDip.price) }]);
    setTempDip({ name: "", price: "" });
  };
  const removeDip = (i) => setDips(dips.filter((_, idx) => idx !== i));

  /* ── Validation ── */
  const validate = () => {
    if (!form.name?.trim())     return "Item name is required.";
    if (!form.category?.trim()) return "Category is required.";
    if (sizes.length === 0)     return "Add at least one size with a price.";
    return null;
  };

  /* ═══════════════════════════════════
     POST /api/menu ✅  |  PUT /api/menu/:id ✅
  ═══════════════════════════════════ */
  const handleSubmit = async () => {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);

    const formData = new FormData();
    formData.append("name", capitalizeWords(form.name));
    formData.append("category", form.category.trim().toLowerCase());
    formData.append("description", capitalizeWords(form.description));
    formData.append("price", sizes[0]?.price || 0);
    formData.append("size", sizes[0]?.name || "Regular");
    formData.append("available", true);
    
    // Arrays converted to JSON strings for backend parsing
    formData.append("topping", JSON.stringify(toppings.map(({ name, price }) => ({ name, price }))));
    formData.append("dips", JSON.stringify(dips.map(({ name, price }) => ({ name, price }))));

    if (form.imageFile) {
      formData.append("image", form.imageFile);
    }
    if (activeTheaterId) {
      formData.append("cinemaId", activeTheaterId);
    }

    try {
      const url    = editId ? `${API_BASE}/menu/${editId}` : `${API_BASE}/menu`;
      const method = editId ? "PUT" : "POST";
      
      const headers = { 
        Authorization : `Bearer ${localStorage.getItem("ownerToken") || localStorage.getItem("token") || ""}`
      }; // DO NOT include Content-Type: application/json for FormData

      const res    = await fetch(url, { method, headers, body: formData });
      const data   = await res.json();

      if (!data.success) {
        setError(data.message || `Failed to ${editId ? "update" : "create"} item.`);
        setSaving(false);
        return;
      }

      const saved     = data.menu;
      const localItem = {
        id               : saved._id,
        _id              : saved._id,
        name             : saved.name,
        description      : saved.description || "",
        category         : capitalizeCategory(saved.category || "Others"),
        image            : saved.image || "",
        cinemaId         : saved.cinemaId || activeTheaterId,
        sizes            : [{ name: saved.size || "Regular", price: saved.price }],
        availableToppings: ensureArray(saved.topping),
        availableDips    : ensureArray(saved.dips),
        isAvailable      : saved.available !== false,
      };

      setItems((prev) =>
        editId
          ? prev.map((i) => (i.id === editId ? localItem : i))
          : [...prev, localItem]
      );
      closeModal();
    } catch (err) {
      console.error("Save error:", err);
      setError("Network error. Could not save item.");
    } finally {
      setSaving(false);
    }
  };

  /* ═══════════════════════════════════
     DELETE /api/menu/:id ✅
  ═══════════════════════════════════ */
  const handleDeleteConfirmed = async () => {
    const { id } = confirmDel;
    setConfirmDel(null);
    setError("");
    try {
      const res  = await fetch(`${API_BASE}/menu/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Failed to delete item."); return; }
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      setError("Network error. Could not delete item.");
    }
  };

  /* ═══════════════════════════════════
     PUT /api/menu/:id ✅ — toggle availability
  ═══════════════════════════════════ */
  const toggleAvailability = async (id) => {
    const item   = items.find((i) => i.id === id);
    const newVal = !item?.isAvailable;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable: newVal } : i)));
    try {
      const res  = await fetch(`${API_BASE}/menu/${id}`, {
        method: "PUT", headers: authHeaders(),
        body  : JSON.stringify({ available: newVal }),
      });
      const data = await res.json();
      if (!data.success)
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable: !newVal } : i)));
    } catch {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable: !newVal } : i)));
    }
  };

  /* ── Modal helpers ── */
  const openAddModal = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSizes([]);
    setToppings([]);
    setDips([]);
    setError("");
    setImgError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
    setImgError("");
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setForm({ name: item.name, description: item.description, category: item.category, image: item.image || "", imageFile: null });
    setSizes(ensureArray(item.sizes));
    setToppings(ensureArray(item.availableToppings));
    setDips(ensureArray(item.availableDips));
    setError("");
    setImgError("");
    setShowModal(true);
  };

  /* ── Group by category ── */
  const groupedItems = items.reduce((acc, item) => {
    const key = item.category || "Others";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  /* ── Loading ── */
  if (loading) return (
    <div className="menu-page">
      <div className="menu-header"><h2>🍔 Food Menu</h2></div>
      <div className="menu-loading">
        <div className="menu-spinner" />
        <p>Loading menu...</p>
      </div>
    </div>
  );

  return (
    <div className="menu-page">

      {/* HEADER */}
      <div className="menu-header">
        <h2>🍔 Food Menu</h2>
        <div className="menu-header-actions">
          <button className="menu-refresh-btn" onClick={loadMenu}>↻ Refresh</button>
          <button className="add-btn" onClick={openAddModal}>+ Add Item</button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && !showModal && (
        <div className="menu-error-bar">
          <span>{error}</span>
          <button className="menu-error-close" onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* EMPTY STATE */}
      {items.length === 0 && !error && (
        <div className="menu-empty">
          <div className="menu-empty-icon">🍿</div>
          <p>No menu items yet. Click <strong>"+ Add Item"</strong> to add one.</p>
        </div>
      )}

      {/* MENU GRID — grouped by category */}
      {Object.keys(groupedItems).sort().map((category) => (
        <div key={category}>
          <h2 className="category-title">{category}</h2>
          <div className="menu-grid">
            {groupedItems[category].map((item) => (
              <div key={item.id} className={`menu-card ${!item.isAvailable ? "disabled" : ""}`}>
                <div className="menu-card-img-wrap">
                  {item.image ? (
                    <img src={item.image} alt={item.name}
                      onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <div className="menu-card-img-placeholder">🍽️</div>
                  )}
                  {!item.isAvailable && (
                    <span className="menu-unavailable-badge">Unavailable</span>
                  )}
                </div>
                <div className="menu-card-body">
                  <h3>{item.name}</h3>
                  {item.description && <p className="menu-card-desc">{item.description}</p>}
                  <div className="card-sizes">
                    {ensureArray(item.sizes).map((s) => (
                      <span key={`${s.name}-${s.price}`}>{s.name} · ₹{s.price}</span>
                    ))}
                  </div>
                  {(ensureArray(item.availableToppings).length > 0 || ensureArray(item.availableDips).length > 0) && (
                    <p className="menu-extras-note">
                      {ensureArray(item.availableToppings).length > 0 &&
                        `${item.availableToppings.length} topping${item.availableToppings.length > 1 ? "s" : ""}`}
                      {ensureArray(item.availableToppings).length > 0 && ensureArray(item.availableDips).length > 0 && " · "}
                      {ensureArray(item.availableDips).length > 0 &&
                        `${item.availableDips.length} dip${item.availableDips.length > 1 ? "s" : ""}`}
                    </p>
                  )}
                  <div className="menu-card-actions">
                    <button className="edit-btn"   onClick={() => handleEdit(item)}>✏ Edit</button>
                    <button className="delete-btn" onClick={() => setConfirmDel({ id: item.id, name: item.name })}>🗑 Delete</button>
                    <button
                      className={`toggle-btn ${item.isAvailable ? "toggle-disable" : "toggle-enable"}`}
                      onClick={() => toggleAvailability(item.id)}
                    >
                      {item.isAvailable ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* DELETE CONFIRM MODAL */}
      {confirmDel && (
        <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
          <div className="modal-box modal-box--confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3 className="confirm-title">Delete "{confirmDel.name}"?</h3>
            <p className="confirm-sub">This action cannot be undone. The item will be permanently removed from the menu.</p>
            <div className="modal-actions">
              <button className="modal-btn modal-btn--cancel" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="modal-btn modal-btn--danger" onClick={handleDeleteConfirmed}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h3 className="modal-title">{editId ? "Edit Menu Item" : "Add Menu Item"}</h3>
              <button className="modal-close-btn" onClick={closeModal}>✕</button>
            </div>

            {error && <div className="modal-error">{error}</div>}

            {/* BASIC INFO */}
            <div className="modal-section">
              <h4 className="modal-section-title">Basic Info</h4>

              <label className="modal-label">Item Name <span className="modal-required">*</span></label>
              <input className="modal-input" placeholder="e.g. Cheese Popcorn"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: capitalizeWords(e.target.value) })} />

              {/* FIX: category auto-capitalizes first letter of each word */}
              <label className="modal-label">
                Category <span className="modal-required">*</span>
                <span className="modal-label-hint"> (auto-capitalized)</span>
              </label>
              <input className="modal-input" placeholder="e.g. Popcorn, Drinks, Snacks"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: capitalizeCategory(e.target.value) })} />

              <label className="modal-label">Description</label>
              <input className="modal-input" placeholder="Short description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: capitalizeWords(e.target.value) })} />
            </div>

            {/* IMAGE UPLOAD — File System */}
            <div className="modal-section">
              <h4 className="modal-section-title">Item Image</h4>

              {/* Image preview */}
              {form.image ? (
                <div className="img-upload-preview">
                  <img src={form.image} alt="preview" />
                  <div className="img-upload-info">
                    <span className="img-upload-status">✅ Image ready</span>
                    <button className="img-remove-btn" onClick={removeImage}>Remove</button>
                  </div>
                </div>
              ) : (
                <div
                  className="img-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="img-dropzone-icon">📷</span>
                  <p className="img-dropzone-text">Click to upload image</p>
                  <p className="img-dropzone-hint">JPG, PNG, WebP or GIF · Max {MAX_FILE_SIZE_MB}MB</p>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />

              {imgError && <p className="img-error">{imgError}</p>}

              {/* Change image button when preview shown */}
              {form.image && (
                <button className="img-change-btn" onClick={() => fileInputRef.current?.click()}>
                  📷 Change Image
                </button>
              )}
            </div>

            {/* SIZES */}
            <div className="modal-section">
              <h4 className="modal-section-title">
                Sizes <span className="modal-section-note">* first size = price sent to API</span>
              </h4>
              <div className="option-preview">
                {sizes.map((s, i) => (
                  <div key={`${s.name}-${s.price}-${i}`} className="option-chip">
                    {s.name} · ₹{s.price}
                    <button className="chip-remove" onClick={() => removeSize(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div className="inline-row">
                <input className="modal-input inline-input" placeholder="Size name"
                  value={tempSize.name}
                  onChange={(e) => setTempSize({ ...tempSize, name: capitalizeWords(e.target.value) })} />
                <input className="modal-input inline-input" placeholder="Price" type="number" min="0"
                  value={tempSize.price}
                  onChange={(e) => setTempSize({ ...tempSize, price: e.target.value })} />
                <button className="inline-add-btn" onClick={addSize}>Add</button>
              </div>
            </div>

            {/* TOPPINGS */}
            <div className="modal-section">
              <h4 className="modal-section-title">Toppings <span className="modal-section-note">optional</span></h4>
              <div className="option-preview">
                {toppings.map((t, i) => (
                  <div key={`${t.name}-${t.price}-${i}`} className="option-chip">
                    {t.name} +₹{t.price}
                    <button className="chip-remove" onClick={() => removeTopping(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div className="inline-row">
                <input className="modal-input inline-input" placeholder="Topping name"
                  value={tempTopping.name}
                  onChange={(e) => setTempTopping({ ...tempTopping, name: capitalizeWords(e.target.value) })} />
                <input className="modal-input inline-input" placeholder="Price" type="number" min="0"
                  value={tempTopping.price}
                  onChange={(e) => setTempTopping({ ...tempTopping, price: e.target.value })} />
                <button className="inline-add-btn" onClick={addTopping}>Add</button>
              </div>
            </div>

            {/* DIPS */}
            <div className="modal-section">
              <h4 className="modal-section-title">Dips <span className="modal-section-note">optional</span></h4>
              <div className="option-preview">
                {dips.map((d, i) => (
                  <div key={`${d.name}-${d.price}-${i}`} className="option-chip">
                    {d.name} +₹{d.price}
                    <button className="chip-remove" onClick={() => removeDip(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div className="inline-row">
                <input className="modal-input inline-input" placeholder="Dip name"
                  value={tempDip.name}
                  onChange={(e) => setTempDip({ ...tempDip, name: capitalizeWords(e.target.value) })} />
                <input className="modal-input inline-input" placeholder="Price" type="number" min="0"
                  value={tempDip.price}
                  onChange={(e) => setTempDip({ ...tempDip, price: e.target.value })} />
                <button className="inline-add-btn" onClick={addDip}>Add</button>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="modal-actions">
              <button className="modal-btn modal-btn--cancel" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="modal-btn modal-btn--save" onClick={handleSubmit} disabled={saving}>
                {saving ? (
                  <span className="modal-saving">
                    <span className="modal-spinner" />
                    Saving...
                  </span>
                ) : (
                  editId ? "Update Item" : "Add Item"
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Menu;