import {Routes, Route } from "react-router-dom";

import Login from "./pages/auth/Login";
// import Register from "./pages/auth/Register";
// import CafeList from "./pages/cafe/CafeList";
// import AddCafe from "./pages/cafe/AddCafe";
// import Menu from "./pages/menu/Menu";
// import Table from "./pages/table/Table";
// import Order from "./pages/order/Order";
// import Customer from "./pages/customer/Customer";
// import Navbar from "./component/Navbar";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Navbar /> */}
        <Route path="/" element={<Login />} />
        {/* <Route path="/register" element={<Register />} />

        <Route path="/cafes" element={<CafeList />} />
        <Route path="/add-cafe" element={<AddCafe />} />
        <Route path="/menu/:cafeId" element={<Menu />} />
        <Route path="/table/:cafeId" element={<Table />} />
        <Route path="/order" element={<Order />} />
        <Route path="/customer/:tableId" element={<Customer />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
