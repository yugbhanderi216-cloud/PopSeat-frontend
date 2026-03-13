import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import "./ForgotPassword.css";

const ForgotPassword = () => {

const navigate = useNavigate();

const [email,setEmail] = useState("");
const [otp,setOtp] = useState(["","","",""]);
const [newPassword,setNewPassword] = useState("");

const [otpSent,setOtpSent] = useState(false);
const [isOtpValid,setIsOtpValid] = useState(false);

const [strength,setStrength] = useState(0);
const [isEightChar,setIsEightChar] = useState(false);

const inputs = useRef([]);


/* ================= SEND OTP ================= */

const sendOtp = async ()=>{

if(!email){
alert("Please enter email");
return;
}

try{

const res = await fetch("http://localhost:5000/api/auth/send-email-otp",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({ email })
});

const data = await res.json();

if(data.success){

setOtpSent(true);
alert("OTP sent to email");

}else{

alert(data.message || "Failed to send OTP");

}

}catch(err){

console.log(err);
alert("Server not connected yet");

}

};


/* ================= OTP CHANGE ================= */

const handleOtpChange = (value,index)=>{

if(!/^\d?$/.test(value)) return;

const newOtp = [...otp];
newOtp[index] = value;

setOtp(newOtp);

if(value && index < 3){
inputs.current[index+1].focus();
}

};


/* ================= VERIFY OTP ================= */

const verifyOtp = async ()=>{

const enteredOtp = otp.join("");

if(enteredOtp.length !== 4){
alert("Enter valid OTP");
return;
}

try{

const res = await fetch("http://localhost:5000/api/auth/verify-email-otp",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email,
otp:enteredOtp
})

});

const data = await res.json();

if(data.success){

setIsOtpValid(true);
alert("OTP verified");

}else{

alert("Invalid OTP");

}

}catch(err){

console.log(err);

}

};


/* ================= PASSWORD CHANGE ================= */

const handlePasswordChange = (value)=>{

setNewPassword(value);

setIsEightChar(value.length >= 8);

const result = zxcvbn(value);

setStrength(result.score);

};


/* ================= RESET PASSWORD ================= */

const handleReset = ()=>{

alert("Password reset request sent to server");

navigate("/login");

};


const strengthText = [
"Very Weak",
"Weak",
"Fair",
"Strong",
"Very Strong"
];


return(

<div className="forgot-page">

<div className="forgot-card">

<h2 className="forgot-title">Reset Password</h2>

<input
type="email"
className="forgot-input"
placeholder="Enter Email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
/>

<button
className="forgot-button"
onClick={sendOtp}
>
Send OTP
</button>


{otpSent && (

<>

{/* OTP INPUT */}

<div className="otp-box">

{otp.map((digit,index)=>(
<input
key={index}
ref={(el)=>inputs.current[index] = el}
type="text"
maxLength="1"
value={digit}

onChange={(e)=>handleOtpChange(e.target.value,index)}

className="otp-input"
/>
))}

</div>


<button
className="forgot-button"
onClick={verifyOtp}
>
Verify OTP
</button>


{/* NEW PASSWORD */}

{isOtpValid && (

<>

<input
type="password"
className="forgot-input"
placeholder="New Password"
value={newPassword}

onChange={(e)=>handlePasswordChange(e.target.value)}
/>


<div className={`rule ${isEightChar ? "valid" : ""}`}>
{isEightChar ? "✔" : "✖"} Minimum 8 Characters
</div>


<div className={`rule ${strength === 4 ? "valid" : ""}`}>
{strength === 4 ? "✔" : "✖"} Password Must Be Very Strong
</div>


<div className="strength-bar">
<div className={`strength strength-${strength}`}></div>
</div>


<small className="strength-text">
Strength: {strengthText[strength]}
</small>


<button
className="forgot-button"
onClick={handleReset}
disabled={!(isEightChar && strength === 4)}
>
Reset Password
</button>

</>

)}

</>

)}

<p className="forgot-text">
<Link to="/login">Back to Login</Link>
</p>

</div>

</div>

);

};

export default ForgotPassword;