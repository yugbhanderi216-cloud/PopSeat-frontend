import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OwnerHome.css";
import logo from "../PopSeat_Logo.png";

const BASE_URL = "http://localhost:5000/api";

const OwnerHome = () => {

const navigate = useNavigate();

const role = localStorage.getItem("role");
const token = localStorage.getItem("token");

const [cinemas,setCinemas] = useState([]);

const [workerName,setWorkerName] = useState("");
const [workerEmail,setWorkerEmail] = useState("");
const [workerPassword,setWorkerPassword] = useState("");



/* ================= AUTH CHECK ================= */

useEffect(()=>{

if(role !== "owner"){
navigate("/login");
}

},[role,navigate]);



/* ================= LOAD CINEMAS ================= */

useEffect(()=>{

loadCinemas();

},[]);


const loadCinemas = async ()=>{

try{

const response = await fetch(`${BASE_URL}/cinema`);

const data = await response.json();

if(data.success){

setCinemas(data.cinemas);

}

}catch(error){

console.log("Server not connected yet");

}

};



/* ================= CREATE WORKER ================= */

const handleCreateWorker = async ()=>{

if(!workerName || !workerEmail || !workerPassword){

alert("Enter all fields");

return;

}

try{

const response = await fetch(`${BASE_URL}/owner/create-worker`,{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},

body:JSON.stringify({
name:workerName,
email:workerEmail,
password:workerPassword
})

});

const data = await response.json();

if(data.success){

alert("Worker created successfully");

setWorkerName("");
setWorkerEmail("");
setWorkerPassword("");

}else{

alert("Failed to create worker");

}

}catch(error){

console.log(error);

}

};



/* ================= UI ================= */

return(

<div className="owner-container">

<div className="owner-header">

<h1>🎬 Owner Control Panel</h1>

<div className="brand">

<img src={logo} alt="PopSeat Logo" />
<h1>PopSeat</h1>

</div>

<button onClick={()=>navigate("/theater-register")}>
+ Add New Theater
</button>

</div>



{/* CINEMA LIST */}

<div className="theater-grid">

{cinemas.map((cinema)=>(

<div key={cinema._id} className="theater-card">

<h2>{cinema.name}</h2>

<p><strong>City:</strong> {cinema.city}</p>

<p><strong>Address:</strong> {cinema.address}</p>

<p><strong>Branch:</strong> {cinema.branchName}</p>

<p><strong>Screens:</strong> {cinema.totalScreens}</p>

<p>
<strong>Hours:</strong> {cinema.openingTime} - {cinema.closingTime}
</p>

<div className="theater-actions">

<button
onClick={()=>
navigate("/theater/overview",{state:{cinemaId:cinema._id}})
}
>
Open Dashboard
</button>

</div>

</div>

))}

</div>



{/* CREATE WORKER SECTION */}

<div className="worker-box">

<h3>Create Worker</h3>

<input
type="text"
placeholder="Worker Name"
value={workerName}
onChange={(e)=>setWorkerName(e.target.value)}
/>

<input
type="email"
placeholder="Worker Email"
value={workerEmail}
onChange={(e)=>setWorkerEmail(e.target.value)}
/>

<input
type="password"
placeholder="Worker Password"
value={workerPassword}
onChange={(e)=>setWorkerPassword(e.target.value)}
/>

<button onClick={handleCreateWorker}>
Create Worker
</button>

</div>



</div>

);

};

export default OwnerHome;