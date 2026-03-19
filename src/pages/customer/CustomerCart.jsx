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

const [cart,setCart] = useState([]);

const goBack = () => navigate(-1);

/* ===============================
   LOAD CART
================================ */

useEffect(()=>{

try{

const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
setCart(savedCart);

}catch{
setCart([]);
}

},[]);

const updateStorage = (updated)=>{

setCart(updated);
localStorage.setItem("cart",JSON.stringify(updated));

};

/* ===============================
   QUANTITY CONTROLS
================================ */

const increaseQty = (id)=>{

const updated = cart.map((item)=>{

const itemId = item.id || item._id;

return itemId === id
? { ...item, quantity: item.quantity + 1 }
: item;

});

updateStorage(updated);

};

const decreaseQty = (id)=>{

const updated = cart
.map((item)=>{

const itemId = item.id || item._id;

return itemId === id
? { ...item, quantity: item.quantity - 1 }
: item;

})
.filter((item)=>item.quantity > 0);

updateStorage(updated);

};

const removeItem = (id)=>{

const updated = cart.filter((item)=>{

const itemId = item.id || item._id;
return itemId !== id;

});

updateStorage(updated);

};

/* ===============================
   TOTAL
================================ */

const total = cart.reduce((sum,item)=>{

const price = Number(item.finalPrice || item.price || 0);
return sum + price * item.quantity;

},0);

/* ===============================
   CHECKOUT
================================ */

const handleCheckout = ()=>{

if(cart.length === 0){
alert("Your cart is empty");
return;
}

/*
Future API:
POST /api/order/create
*/

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

cart.map((item)=>{

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

<p className="cart-meta">
Size: {item.size}
</p>

)}

<p className="cart-price">
₹ {item.finalPrice || item.price} × {item.quantity}
</p>

</div>

<div className="cart-controls">

<button
className="minus-btn"
onClick={()=>decreaseQty(itemId)}
>
-
</button>

<span>{item.quantity}</span>

<button
className="plus-btn"
onClick={()=>increaseQty(itemId)}
>
+
</button>

<button
className="delete-btn"
onClick={()=>removeItem(itemId)}
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
>
Proceed to Checkout
</button>

</div>

</div>

);

};

export default CustomerCart;