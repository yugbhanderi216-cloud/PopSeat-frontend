import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EditTheater.css";

/* SMART AUTO CAPITALIZE */
const capitalizeSmart = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase());
};

const EditTheater = () => {

  const navigate = useNavigate();
  const [theaterData, setTheaterData] = useState(null);

  const theaterId = localStorage.getItem("activeOwnerTheaterId");

  /* FETCH THEATER FROM API */

  useEffect(() => {

    const fetchTheater = async () => {

      try {

        const res = await fetch(
          "http://localhost:5000/api/cinema"
        );

        const data = await res.json();

        if (data.success) {

          const selected = data.cinemas.find(
            (c) => c._id === theaterId
          );

          if (selected) {
            setTheaterData(selected);
          }

        }

      } catch (error) {

        console.error("Error loading theater:", error);

      }

    };

    fetchTheater();

  }, [theaterId]);

  if (!theaterData) {
    return <h2 style={{ padding: "20px" }}>Loading Theater...</h2>;
  }

  /* HANDLE CHANGE */

  const handleChange = (e) => {

    const { name, value } = e.target;

    const capitalFields = [
      "ownerName",
      "name",
      "branchName",
      "city",
      "address"
    ];

    let newValue = value;

    if (capitalFields.includes(name)) {
      newValue = capitalizeSmart(value);
    }

    setTheaterData((prev) => ({
      ...prev,
      [name]: newValue
    }));

  };

  /* SAVE CHANGES */

  const handleSave = async () => {

    try {

      const res = await fetch(
        `http://localhost:5000/api/cinema/${theaterData._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(theaterData)
        }
      );

      const data = await res.json();

      if (data.success) {

        alert("Theater Updated Successfully ✅");
        navigate(-1);

      } else {

        alert("Update failed");

      }

    } catch (error) {

      console.error("Update error:", error);

    }

  };

  return (

    <div className="edit-container">

      <h2>Edit Theater</h2>

      <input
        name="ownerName"
        value={theaterData.ownerName || ""}
        onChange={handleChange}
        placeholder="Owner Name"
      />

      <input
        name="name"
        value={theaterData.name || ""}
        onChange={handleChange}
        placeholder="Theater Name"
      />

      <input
        name="branchName"
        value={theaterData.branchName || ""}
        onChange={handleChange}
        placeholder="Branch"
      />

      <input
        name="city"
        value={theaterData.city || ""}
        onChange={handleChange}
        placeholder="City"
      />

      <textarea
        name="address"
        value={theaterData.address || ""}
        onChange={handleChange}
        placeholder="Full Address"
      />

      <input
        name="contactNumber"
        value={theaterData.contactNumber || ""}
        onChange={handleChange}
        placeholder="Contact Number"
      />

      <input
        name="totalScreens"
        value={theaterData.totalScreens || ""}
        onChange={handleChange}
        placeholder="Screens"
      />

      <label>Opening Time</label>
      <input
        type="time"
        name="openingTime"
        value={theaterData.openingTime || ""}
        onChange={handleChange}
      />

      <label>Closing Time</label>
      <input
        type="time"
        name="closingTime"
        value={theaterData.closingTime || ""}
        onChange={handleChange}
      />

      <button onClick={handleSave}>
        Save Changes
      </button>

    </div>

  );

};

export default EditTheater;