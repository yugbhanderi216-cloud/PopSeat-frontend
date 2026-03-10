import { useEffect, useState } from "react";
import api from "../../api/axios";
import { QRCodeCanvas } from "qrcode.react";
import { useParams } from "react-router-dom";

export default function Tables() {
  const { cafeId } = useParams();
  const [tables, setTables] = useState([]);

  useEffect(() => {
    api.get(`/cafes/${cafeId}/tables`).then(res => setTables(res.data));
  }, []);

  const addTable = async () => {
    await api.post(`/cafes/${cafeId}/tables`);
    window.location.reload();
  };

  return (
    <>
      <h2>Tables</h2>

      <button onClick={addTable}>Add Table</button>

      {tables.map(t => (
        <div key={t._id} style={{border:"1px solid #ccc", margin:10, padding:10}}>
          <p>Table: {t.number}</p>

          <QRCodeCanvas
            value={`http://localhost:5173/customer/${t._id}`}
            size={150}
          />
        </div>
      ))}
    </>
  );
}
