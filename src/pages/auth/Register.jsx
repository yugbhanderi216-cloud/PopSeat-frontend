import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import logo from "../PopSeat_Logo.png";

/* Images */
import img1 from "../image.png";
import img2 from "../image_3.png";
import img3 from "../image_2.png";
import img4 from "../image_1.png";

import "./Register.css";

const strengthText = [
  "Very Weak",
  "Weak",
  "Fair",
  "Strong",
  "Very Strong",
];

function Register() {

const navigate = useNavigate();

const [formData,setFormData] = useState({
name:"",
email:"",
password:""
});

const [strength,setStrength] = useState(0);
const [isEightChar,setIsEightChar] = useState(false);
const [loading,setLoading] = useState(false);


/* ================= INPUT CHANGE ================= */

const handleChange = (e)=>{

const {name,value} = e.target;

setFormData({
...formData,
[name]:value
});

if(name === "password"){

setIsEightChar(value.length >= 8);

const result = zxcvbn(value);

setStrength(result.score);

}

};


/* ================= REGISTER ================= */

const handleRegister = async ()=>{

if(!(isEightChar && strength === 4)) return;

try{

setLoading(true);

const response = await fetch("http://localhost:5000/api/auth/register",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

name:formData.name,
email:formData.email,
password:formData.password,
role:"owner"

})

});

const data = await response.json();


if(data.success){

alert("Registration successful");

navigate("/login");

}else{

alert(data.message || "Registration failed");

}

}catch(error){

console.log(error);
alert("Server error");

}finally{

setLoading(false);

}

};


return (

<div className="register-page">

{/* LEFT SIDE - FORM */}

<div className="register-right">

<div className="register-card">

<div className="brand">

<img src={logo} alt="PopSeat Logo" />
<h1>PopSeat</h1>

</div>

<h2>Create Owner Account</h2>

<form
onSubmit={(e)=>{
e.preventDefault();
handleRegister();
}}
>

<input
name="name"
value={formData.name}
placeholder="Full Name"
onChange={handleChange}
required
/>

<input
name="email"
type="email"
value={formData.email}
placeholder="Email"
onChange={handleChange}
required
/>

<input
type="password"
name="password"
value={formData.password}
placeholder="Password"
onChange={handleChange}
required
/>


{/* PASSWORD RULES */}

<div className={`rule ${isEightChar ? "valid" : ""}`}>
{isEightChar ? "✔" : "✖"} Minimum 8 Characters
</div>

<div className={`rule ${strength === 4 ? "valid" : ""}`}>
{strength === 4 ? "✔" : "✖"} Password Must Be Very Strong
</div>


{/* PASSWORD STRENGTH */}

<div className="strength-bar">
<div className={`strength strength-${strength}`}></div>
</div>

<small className="strength-text">
Strength: {strengthText[strength]}
</small>


<button
type="submit"
disabled={!(isEightChar && strength === 4) || loading}
>

{loading ? "Registering..." : "Register"}

</button>

</form>


<p>
Already have an account? <Link to="/login">Login</Link>
</p>

</div>

</div>


{/* RIGHT SIDE IMAGES */}

<div className="register-left">

<img src={img1} alt="" />
<img src={img2} alt="" />
<img src={img3} alt="" />
<img src={img4} alt="" />

</div>

</div>

);

}

export default Register;