import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../PopSeat_Logo.png";
import img1 from "../image_1.png";
import img2 from "../image_2.png";
import img3 from "../image_3.png";
import img4 from "../image.png";

const Login = () => {

const navigate = useNavigate();

const [email,setEmail] = useState("");
const [password,setPassword] = useState("");
const [selectedRole,setSelectedRole] = useState("owner");
const [loading,setLoading] = useState(false);


/* ================= LOGIN FUNCTION ================= */

const handleLogin = async () => {

if(!email || !password){

alert("Please enter email and password");
return;

}

try{

setLoading(true);

const response = await fetch("http://localhost:5000/api/auth/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

email:email,
password:password,
role:selectedRole

})

});

const data = await response.json();


/* ================= LOGIN SUCCESS ================= */

if(data.success){

localStorage.setItem("token",data.token);
localStorage.setItem("role",data.role);
localStorage.setItem("isAuth","true");

/* OWNER DASHBOARD */

if(data.role === "owner"){

navigate("/owner/home");

}

/* WORKER DASHBOARD */

if(data.role === "worker"){

navigate("/worker/dashboard");

}

}else{

alert("Invalid email or password");

}

}catch(error){

console.log(error);
alert("Server error");

}

finally{

setLoading(false);

}

};


/* ================= UI ================= */

return (

<div className="login-page">

<div className="login-left">

<img src={img1} alt="" />
<img src={img2} alt="" />
<img src={img3} alt="" />
<img src={img4} alt="" />

</div>

<div className="login-right">

<div className="login-card">

<div className="brand">

<img src={logo} alt="PopSeat Logo" />
<h1>PopSeat</h1>

</div>

<h2 className="login-title">Login</h2>


{/* ROLE SELECTOR */}

<div className="role-selector">

<div
className={`role-card ${selectedRole === "owner" ? "active" : ""}`}
onClick={()=>setSelectedRole("owner")}
>
👑 Owner
</div>

<div
className={`role-card ${selectedRole === "worker" ? "active" : ""}`}
onClick={()=>setSelectedRole("worker")}
>
👷 Worker
</div>

</div>


{/* EMAIL */}

<input
className="login-input"
type="email"
placeholder="Email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
/>


{/* PASSWORD */}

<input
className="login-input"
type="password"
placeholder="Password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>


<button
className="login-button"
onClick={handleLogin}
disabled={loading}
>

{loading ? "Logging in..." : "Login"}

</button>


<p className="login-link">
<Link to="/forgotpassword">Forgot password?</Link>
</p>

<p className="login-text">
Don’t have an account? <Link to="/register">Register</Link>
</p>

</div>

</div>

</div>

);

};

export default Login;