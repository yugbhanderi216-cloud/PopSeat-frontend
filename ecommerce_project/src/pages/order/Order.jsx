import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await api.get("/orders");
      setOrders(res.data || []);
    } catch (err) {
      console.log(err);
      alert("Failed to load orders");
    }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/orders/${id}`, { status });
    loadOrders();
  };

  return (
    <div className="container mt-4">
      <h3>Orders</h3>

      {orders.length === 0 && <p>No orders yet</p>}

      {orders.map(o => (
        <div key={o._id} className="card p-3 mb-3">

          <strong>Table: {o.table?.number || "N/A"}</strong>
          <p>Status: {o.status}</p>

          {(o.items || []).map((i, index) => (
            <p key={index}>
              {i.name} × {i.qty || 1}
            </p>
          ))}

          <div>
            <button
              className="btn btn-sm btn-secondary me-2"
              onClick={() => updateStatus(o._id, "preparing")}
            >
              Preparing
            </button>

            <button
              className="btn btn-sm btn-success"
              onClick={() => updateStatus(o._id, "served")}
            >
              Served
            </button>
          </div>

        </div>
      ))}
    </div>
  );
}
