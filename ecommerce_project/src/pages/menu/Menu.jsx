import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function Menu() {
  const { cafeId } = useParams();
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    api.get(`/cafes/${cafeId}/menu`).then(res => setMenu(res.data));
  }, []);

  return (
    <>
      <h2>Menu</h2>
      {menu.map(i => (
        <div key={i._id}>{i.name}</div>
      ))}
    </>
  );
}
