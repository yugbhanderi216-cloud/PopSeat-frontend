import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function CustomerMenu() {
  const { tableId } = useParams();
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    api.get(`/qr/scan/${tableId}`).then(res => setMenu(res.data));
  }, []);

  const addToCart = item => {
    setCart([...cart, item]);
  };

  const placeOrder = async () => {
    await api.post("/orders", {
      tableId,
      items: cart,
    });

    alert("Order placed!");
    setCart([]);
  };

  return (
    <>
      <h2>Menu</h2>

      {menu.map(i => (
        <div key={i._id}>
          {i.name} - ₹{i.price}
          <button onClick={()=>addToCart(i)}>Add</button>
        </div>
      ))}

      <h3>Cart ({cart.length})</h3>
      <button onClick={placeOrder}>Place Order</button>
    </>
  );
}
