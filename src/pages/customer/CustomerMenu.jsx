import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CustomerMenu.css";

const API_BASE = "https://popseat.onrender.com";

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

const [items,setItems] = useState([]);
const [activeCategory,setActiveCategory] = useState("");
const [cart,setCart] = useState([]);

/* 🔙 GO BACK */

const goBack = ()=>navigate(-1);

/* ================= SAVE INFO ================= */

useEffect(()=>{

if(screen) localStorage.setItem("screenNo",screen);
if(seat) localStorage.setItem("seatNo",seat);
if(theaterId) localStorage.setItem("customerTheaterId",theaterId);
if(type) localStorage.setItem("seatType",type);

},[screen,seat,theaterId,type]);

/* ================= LOAD MENU FROM API ================= */

useEffect(()=>{

const fetchMenu = async ()=>{

try{

const res = await fetch(`${API_BASE}/api/menu`);
const data = await res.json();

if(data.success){

const availableItems = data.menu.filter(
(item)=>item.available !== false
);

setItems(availableItems);

if(availableItems.length > 0){
setActiveCategory(availableItems[0].category);
}

}

}catch(error){

console.log(error);

}

};

fetchMenu();

},[]);

/* ================= LOAD CART ================= */

useEffect(()=>{

try{

const savedCart =
JSON.parse(localStorage.getItem("cart")) || [];

setCart(savedCart);

}catch{

setCart([]);

}

},[]);

/* ================= SAVE CART ================= */

useEffect(()=>{

localStorage.setItem("cart",JSON.stringify(cart));

},[cart]);

/* ================= CATEGORY ================= */

const categories =
[...new Set(items.map((i)=>i.category))];

const filteredItems =
items.filter((i)=>i.category === activeCategory);

/* ================= CART TOTAL ================= */

const total = cart.reduce(
(sum,item)=>sum + (item.finalPrice || item.price) * item.quantity,
0
);

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
onClick={()=>
navigate(`/customer/cart?theaterId=${theaterId}&screen=${screen}&seat=${seat}`)
}
>
🛒 {cart.length}
</button>

</div>

{/* CATEGORY */}

<div className="category-tabs">

{categories.map((cat)=>(
<button
key={cat}
className={activeCategory === cat ? "active-tab" : ""}
onClick={()=>setActiveCategory(cat)}
>
{cat}
</button>
))}

</div>

{/* FOOD GRID */}

<div className="customer-grid">

{filteredItems.map((item)=>(

<div
key={item._id}
className="customer-card"

onClick={()=>{
if(item.available === false) return;

navigate("/customer/item",{
state:{ item,theaterId,screen,seat },
});

}}
>

{item.image && (

<img
src={item.image}
alt={item.name}
className="customer-food-img"
/>

)}

<div className="card-body">

<h3>{item.name}</h3>

<p className="desc">{item.description}</p>

<p className="price">
₹ {item.price}
</p>

<p className="tap-note">
Tap to customize ➜
</p>

</div>

</div>

))}

</div>

</div>

{/* CART BAR */}

{cart.length > 0 && (

<div
className="bottom-cart-bar"
onClick={()=>
navigate(`/customer/cart?theaterId=${theaterId}&screen=${screen}&seat=${seat}`)
}
>

<div>
₹ {total} | {cart.length} item(s)
</div>

<div>
View Cart ➜
</div>

</div>

)}

</div>

);

};

export default CustomerMenu;