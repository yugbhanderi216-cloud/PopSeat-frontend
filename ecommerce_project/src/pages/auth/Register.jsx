// import { useState } from "react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";

// export default function Register() {
//   const navigate = useNavigate();

//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     password: "",
//   });

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleChange = (e) => {
//     setForm({
//       ...form,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");

//     if (!form.name || !form.email || !form.password) {
//       return setError("All fields are required");
//     }

//     try {
//       setLoading(true);

//       const res = await axios.post("http://localhost:5000/api/auth/register", {
//         name: form.name,
//         email: form.email,
//         password: form.password,
//       });

//       console.log("Registered:", res.data);

//       alert("Registration successful!");

//       // redirect to login page
//       navigate("/login");
//     } catch (err) {
//       setError(err.response?.data?.message || "Registration failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={styles.container}>
//       <form onSubmit={handleSubmit} style={styles.form}>
//         <h2>Create Account</h2>

//         {error && <p style={styles.error}>{error}</p>}

//         <input
//           type="text"
//           name="name"
//           placeholder="Full Name"
//           value={form.name}
//           onChange={handleChange}
//           style={styles.input}
//         />

//         <input
//           type="email"
//           name="email"
//           placeholder="Email"
//           value={form.email}
//           onChange={handleChange}
//           style={styles.input}
//         />

//         <input
//           type="password"
//           name="password"
//           placeholder="Password"
//           value={form.password}
//           onChange={handleChange}
//           style={styles.input}
//         />

//         <button disabled={loading} style={styles.button}>
//           {loading ? "Registering..." : "Register"}
//         </button>
//       </form>
//     </div>
//   );
// }

// const styles = {
//   container: {
//     minHeight: "100vh",
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "center",
//     background: "#f5f5f5",
//   },
//   form: {
//     background: "#fff",
//     padding: 30,
//     borderRadius: 8,
//     width: 320,
//     boxShadow: "0 0 10px rgba(0,0,0,0.1)",
//   },
//   input: {
//     width: "100%",
//     padding: 10,
//     marginBottom: 12,
//   },
//   button: {
//     width: "100%",
//     padding: 10,
//     cursor: "pointer",
//   },
//   error: {
//     color: "red",
//     marginBottom: 10,
//   },
// };
