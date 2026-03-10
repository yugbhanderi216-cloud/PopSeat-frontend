// import { useState } from "react";
// import api from "../../api/axios";

// export default function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleLogin = async () => {
//     try {
//       const res = await api.post("/auth/login", { email, password });
//       localStorage.setItem("token", res.data.token);
//       window.location.href = "/cafes";
//     } catch (err) {
//       alert("Invalid login");
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="bg-white p-8 rounded-xl shadow-md w-80">

//         <h2 className="text-2xl font-bold text-center mb-6">Cafe Login</h2>

//         <input
//           className="w-full border rounded px-3 py-2 mb-3 focus:outline-none focus:ring"
//           placeholder="Email"
//           onChange={e => setEmail(e.target.value)}
//         />

//         <input
//           type="password"
//           className="w-full border rounded px-3 py-2 mb-4 focus:outline-none focus:ring"
//           placeholder="Password"
//           onChange={e => setPassword(e.target.value)}
//         />

//         <button
//           onClick={handleLogin}
//           className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
//         >
//           Login
//         </button>

//         <p className="text-sm text-center mt-4">
//           New user?{" "}
//           <a href="/register" className="text-blue-600 underline">
//             Register
//           </a>
//         </p>

//       </div>
//     </div>
//   );
// }

import React from 'react'

const Login = () => {
  return (
    <div className=' bg-black-100'>
      
    </div>
  )
}

export default Login

