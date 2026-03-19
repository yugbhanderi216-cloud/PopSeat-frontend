import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

import TheaterRegister from "./pages/theater/TheaterRegister";
import TheaterLayout from "./pages/theater/TheaterLayout";
import TheaterDashboard from "./pages/theater/TheaterDashboard";
import EditTheater from "./pages/theater/EditTheater";
import Menu from "./pages/theater/Menu";
import Orders from "./pages/theater/Orders";
import Analytics from "./pages/theater/Analytics";
import QRGenerator from "./pages/theater/QRGenerator";

import CustomerWelcome from "./pages/customer/CustomerWelcome";
import CustomerMenu from "./pages/customer/CustomerMenu";
import CustomerCart from "./pages/customer/CustomerCart";
import PaymentPage from "./pages/customer/PaymentPage";
import OrderTracking from "./pages/customer/OrderTracking";
import CustomerItemDetails from "./pages/customer/CustomerItemDetails";
import OrderSuccess from "./pages/customer/OrderSuccess";
import CustomerLogin from "./pages/customer/CustomerLogin";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

import WorkerDashboard from "./pages/worker/WorkerDashboard";

import OwnerHome from "./pages/owner/OwnerHome";
import OwnerPlan from "./pages/owner/OwnerPlan";
import OwnerPayment from "./pages/owner/OwnerPayment";
import RenewPlan from "./pages/owner/RenewPlan";

function App() {
  return (
    <Routes>

      {/* 🔹 Default redirect */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* 🔹 Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgotpassword" element={<ForgotPassword />} />

      {/* 🔹 Theater Registration */}
      <Route path="/theater-register" element={<TheaterRegister />} />
      <Route path="/owner/home" element={<OwnerHome />} />

      {/* 🔹 Theater Admin Panel */}
      <Route path="/theater" element={<TheaterLayout />}>
        <Route index element={<Navigate to="overview" />} />
        <Route path="overview" element={<TheaterDashboard />} />
        <Route path="menu" element={<Menu />} />
        <Route path="orders" element={<Orders />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<EditTheater />} />
        <Route path="qr" element={<QRGenerator />} />
      </Route>

      {/* 🔥 CUSTOMER FLOW */}
      <Route path="/customer" element={<CustomerWelcome />} />
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/customer/menu" element={<CustomerMenu />} />
      <Route path="/customer/cart" element={<CustomerCart />} />
      <Route path="/customer/item" element={<CustomerItemDetails />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/tracking" element={<OrderTracking />} />
      <Route path="/order-success" element={<OrderSuccess />} />

      {/* 🔹 ADMIN PANEL */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />

      {/* 🔹 WORKER PANEL */}
      <Route path="/worker" element={<WorkerDashboard />} />

      {/* 🔹 OWNER PLAN FLOW */}
      <Route path="/owner/plan" element={<OwnerPlan />} />
      <Route path="/owner/payment" element={<OwnerPayment />} />
      <Route path="/renew-plan" element={<RenewPlan />} />

    </Routes>
  );
}

export default App;