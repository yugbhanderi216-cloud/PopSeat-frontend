import React, { useEffect, useState } from "react";
import axios from "axios";

const CafeList = () => {

  const [cafes, setCafes] = useState([]);

  useEffect(() => {
    fetchCafes();
  }, []);

  const fetchCafes = async () => {
    const ownerId = localStorage.getItem("userId");

    if (!ownerId) return;

    try {
      const res = await axios.get(
        `http://localhost:5000/api/cafe/my-cafes/${ownerId}`
      );

      setCafes(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="min-h-screen bg-blue-100 p-6">

      <h1 className="text-2xl font-bold mb-6">My Cafes</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cafes.map(cafe => (
          <div key={cafe._id} className="bg-white p-4 rounded shadow">

            <h2 className="text-lg font-semibold">{cafe.name}</h2>
            <p className="text-gray-600">{cafe.address}</p>

            <p className="mt-2">
              Tables: {cafe.tables?.length || 0}
            </p>

            <p>
              Menu: {cafe.menu ? "Created" : "Not Created"}
            </p>

          </div>
        ))}
      </div>

    </div>
  );
};

export default CafeList;
