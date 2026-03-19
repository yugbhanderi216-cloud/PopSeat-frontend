import React, { useState, useEffect } from "react";
import "./Menu.css";

/* ---------- DATA SANITIZER ---------- */
const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
};

/* ---------- AUTO CAPITALIZE ---------- */
const capitalizeWords = (text) => {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
};

const Menu = () => {

  const [items, setItems] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const emptyForm = { name: "", description: "", category: "", image: null };
  const [form, setForm] = useState(emptyForm);

  const [sizes, setSizes] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [dips, setDips] = useState([]);

  const [tempSize, setTempSize] = useState({ name: "", price: "" });
  const [tempTopping, setTempTopping] = useState({ name: "", price: "", image: null });
  const [tempDip, setTempDip] = useState({ name: "", price: "", image: null });

  /* ---------- Load Menu From API ---------- */
  const loadMenu = async () => {

    try {

      const res = await fetch("http://localhost:5000/api/menu");
      const data = await res.json();

      if (data.success) {

        const cleanedItems = data.menu.map((item) => ({
          id: item._id,
          name: item.name,
          description: item.description || "",
          category: capitalizeWords(item.category || "Others"),
          image: item.image,
          sizes: [{ name: "Regular", price: item.price }],
          availableToppings: ensureArray(item.topping),
          availableDips: ensureArray(item.dips),
          isAvailable: item.available
        }));

        setItems(cleanedItems);

      }

    } catch (error) {

      console.error("Menu API error:", error);

    }

  };

  useEffect(() => {
    loadMenu();
  }, []);

  /* ---------- Image Upload ---------- */
  const handleImageUpload = (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  /* ---------- Add Options ---------- */
  const addSize = () => {
    if (!tempSize.name || !tempSize.price) return;

    setSizes([
      ...sizes,
      {
        name: capitalizeWords(tempSize.name),
        price: Number(tempSize.price)
      }
    ]);

    setTempSize({ name: "", price: "" });
  };

  const addTopping = () => {
    if (!tempTopping.name || !tempTopping.price) return;

    setToppings([
      ...toppings,
      {
        ...tempTopping,
        name: capitalizeWords(tempTopping.name),
        price: Number(tempTopping.price)
      }
    ]);

    setTempTopping({ name: "", price: "", image: null });
  };

  const addDip = () => {
    if (!tempDip.name || !tempDip.price) return;

    setDips([
      ...dips,
      {
        ...tempDip,
        name: capitalizeWords(tempDip.name),
        price: Number(tempDip.price)
      }
    ]);

    setTempDip({ name: "", price: "", image: null });
  };

  /* ---------- Save Item (Local Temporary) ---------- */
  const handleSubmit = () => {

    if (!form.name || !form.category || sizes.length === 0) {
      alert("Add name, category and at least one size");
      return;
    }

    const newItem = {
      id: editId || Date.now(),
      ...form,
      name: capitalizeWords(form.name),
      category: capitalizeWords(form.category),
      description: capitalizeWords(form.description),
      sizes,
      availableToppings: toppings,
      availableDips: dips,
      isAvailable: true
    };

    let updated;

    if (editId) {
      updated = items.map((i) => (i.id === editId ? newItem : i));
    } else {
      updated = [...items, newItem];
    }

    setItems(updated);

    closeModal();
  };

  /* ---------- CRUD ---------- */

  const openAddModal = () => {
    setEditId(null);
    setForm(emptyForm);
    setSizes([]);
    setToppings([]);
    setDips([]);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleEdit = (item) => {

    setEditId(item.id);
    setForm(item);
    setSizes(ensureArray(item.sizes));
    setToppings(ensureArray(item.availableToppings));
    setDips(ensureArray(item.availableDips));

    setShowModal(true);

  };

  const handleDelete = (id) => {
    const filtered = items.filter((i) => i.id !== id);
    setItems(filtered);
  };

  /* ---------- TOGGLE AVAILABILITY ---------- */
  const toggleAvailability = (id) => {

    const updated = items.map((item) =>
      item.id === id
        ? { ...item, isAvailable: !item.isAvailable }
        : item
    );

    setItems(updated);

  };

  /* ---------- GROUP BY CATEGORY ---------- */

  const groupedItems = items.reduce((acc, item) => {

    const key = item.category || "Others";

    if (!acc[key]) acc[key] = [];

    acc[key].push(item);

    return acc;

  }, {});

  return (

    <div className="menu-page">

      <div className="menu-header">

        <h2>🍔 Food Menu</h2>

        <button className="add-btn" onClick={openAddModal}>
          + Add Item
        </button>

      </div>


      {Object.keys(groupedItems).map((category) => (

        <div key={category}>

          <h2 className="category-title">
            {category}
          </h2>

          <div className="menu-grid">

            {groupedItems[category].map((item) => (

              <div
                key={item.id}
                className={`menu-card ${item.isAvailable === false ? "disabled" : ""}`}
              >

                {item.image && (
                  <img src={item.image} alt={item.name} />
                )}

                <h3>{item.name}</h3>

                <p>{item.description}</p>

                <div className="card-sizes">

                  {ensureArray(item.sizes).map((s, i) => (

                    <span key={i}>
                      {s.name} ₹{s.price}
                    </span>

                  ))}

                </div>

                <button
                  className="edit-btn"
                  onClick={() => handleEdit(item)}
                >
                  Edit
                </button>

                <button
                  className="delete-btn"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>

                <button
                  className="toggle-btn"
                  onClick={() => toggleAvailability(item.id)}
                >
                  {item.isAvailable === false ? "Enable" : "Disable"}
                </button>

              </div>

            ))}

          </div>

        </div>

      ))}


      {showModal && (

        <div className="modal-overlay">

          <div className="modal-box">

            <h3>{editId ? "Edit Item" : "Add Item"}</h3>

            <input
              placeholder="Item Name"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: capitalizeWords(e.target.value)
                })
              }
            />

            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: capitalizeWords(e.target.value)
                })
              }
            />

            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: capitalizeWords(e.target.value)
                })
              }
            />

            <input
              type="file"
              onChange={(e) =>
                handleImageUpload(e, (img) =>
                  setForm({ ...form, image: img })
                )
              }
            />

            {/* Sizes */}
            <h4>Sizes</h4>

            <div className="option-preview">

              {sizes.map((s, i) => (
                <div key={i} className="option-chip">
                  {s.name} ₹{s.price}
                </div>
              ))}

            </div>

            <div className="inline-row">

              <input
                placeholder="Size"
                value={tempSize.name}
                onChange={(e) =>
                  setTempSize({
                    ...tempSize,
                    name: capitalizeWords(e.target.value)
                  })
                }
              />

              <input
                placeholder="Price"
                value={tempSize.price}
                onChange={(e) =>
                  setTempSize({
                    ...tempSize,
                    price: e.target.value
                  })
                }
              />

              <button onClick={addSize}>
                Add
              </button>

            </div>

            <button onClick={handleSubmit}>
              Save Item
            </button>

            <button onClick={closeModal}>
              Cancel
            </button>

          </div>

        </div>

      )}

    </div>

  );

};

export default Menu;