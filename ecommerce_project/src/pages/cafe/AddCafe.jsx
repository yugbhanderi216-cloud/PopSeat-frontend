import { useState } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";

export default function AddCafe() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  const saveCafe = async () => {
    if (!name || !location) {
      alert("Fill all fields");
      return;
    }

    try {
      await api.post("/cafe", { name, location });
      alert("Cafe Added Successfully");
      navigate("/cafes");
    } catch (err) {
      alert("Error adding cafe");
    }
  };

  return (
    <div className="container mt-4">
      <h3>Add Cafe</h3>

      <input
        className="form-control mb-2"
        placeholder="Cafe Name"
        onChange={e => setName(e.target.value)}
      />

      <input
        className="form-control mb-2"
        placeholder="Location"
        onChange={e => setLocation(e.target.value)}
      />

      <button className="btn btn-success" onClick={saveCafe}>
        Save Cafe
      </button>
    </div>
  );
}
