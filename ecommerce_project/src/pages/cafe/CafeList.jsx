// import { useEffect, useState } from "react";
// import api from "../../api/axios";
// import { useNavigate } from "react-router-dom";

// export default function CafeList() {
//   const [cafes, setCafes] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     loadCafes();
//   }, []);

//   const loadCafes = async () => {
//     const res = await api.get("/cafe");
//     setCafes(res.data);
//   };

//   const deleteCafe = async id => {
//     await api.delete(`/cafe/${id}`);
//     loadCafes();
//   };

//   return (
//     <div className="container mt-3">
//       <h2>My Cafes</h2>

//       <button className="btn btn-primary mb-3" onClick={()=>navigate("/add-cafe")}>
//         Add Cafe
//       </button>

//       {cafes.map(c => (
//         <div key={c._id} className="card p-2 mb-2">

//           <h5>{c.name}</h5>
//           <p>{c.location}</p>

//           <button className="btn btn-sm btn-info me-2"
//             onClick={()=>navigate(`/menu/${c._id}`)}>
//             Menu
//           </button>

//           <button className="btn btn-sm btn-warning me-2"
//             onClick={()=>navigate(`/tables/${c._id}`)}>
//             Tables
//           </button>

//           <button className="btn btn-sm btn-danger"
//             onClick={()=>deleteCafe(c._id)}>
//             Delete
//           </button>

//         </div>
//       ))}
//     </div>
//   );
// }




// import { useNavigate } from "react-router-dom";

// export default function CafeDashboard() {
//   const navigate = useNavigate();

//   // Dummy data (later replace with API)
//   const cafes = [
//     { id: 1, name: "Blue Moon Cafe", location: "Ahmedabad" },
//     { id: 2, name: "Coffee Corner", location: "Surat" },
//   ];

//   return (
//     <div className="min-h-screen bg-gray-100 p-6">

//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">My Cafes</h1>

//         <button
//           onClick={() => navigate("/add-cafe")}
//           className="bg-blue-600 text-white px-4 py-2 rounded"
//         >
//           + Add Cafe
//         </button>
//       </div>

//       {/* Cafe Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         {cafes.map((cafe) => (
//           <div key={cafe.id} className="bg-white p-4 rounded shadow">

//             <div className="h-32 bg-gray-200 mb-3 rounded"></div>

//             <h2 className="text-lg font-semibold">{cafe.name}</h2>
//             <p className="text-gray-500">{cafe.location}</p>

//             <div className="flex gap-2 mt-4">
//               <button className="bg-green-500 text-white px-3 py-1 rounded">
//                 View
//               </button>

//               <button className="bg-yellow-500 text-white px-3 py-1 rounded">
//                 Edit
//               </button>

//               <button className="bg-red-500 text-white px-3 py-1 rounded">
//                 Delete
//               </button>
//             </div>

//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
