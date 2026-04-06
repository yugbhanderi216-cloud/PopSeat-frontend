import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

import Login          from "./pages/auth/Login";
import Register       from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

import LandingPage    from "./pages/LandingPage";
import Terms          from "./pages/Terms";
import Privacy        from "./pages/Privacy";

import TheaterRegister from "./pages/theater/TheaterRegister";
import TheaterLayout   from "./pages/theater/TheaterLayout";
import TheaterDashboard from "./pages/theater/TheaterDashboard";
import EditTheater     from "./pages/theater/EditTheater";
import Menu            from "./pages/theater/Menu";
import Orders          from "./pages/theater/Orders";
import Analytics       from "./pages/theater/Analytics";
import QRGenerator     from "./pages/theater/QRGenerator";

import CustomerWelcome     from "./pages/customer/CustomerWelcome";
import CustomerMenu        from "./pages/customer/CustomerMenu";
import CustomerCart        from "./pages/customer/CustomerCart";
import PaymentPage         from "./pages/customer/PaymentPage";
import OrderTracking       from "./pages/customer/OrderTracking";
import CustomerItemDetails from "./pages/customer/CustomerItemDetails";
import OrderSuccess        from "./pages/customer/OrderSuccess";
import CustomerLogin       from "./pages/customer/CustomerLogin";

import AdminLogin     from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

import OwnerHome    from "./pages/owner/OwnerHome";
import OwnerPlan    from "./pages/owner/OwnerPlan";
import OwnerPayment from "./pages/owner/OwnerPayment";
import RenewPlan    from "./pages/owner/RenewPlan";

/* ─────────────────────────────────────────────────────────────
   PrivateRoute
   Protects routes by token presence and role.
   allowedRoles: lowercase string array e.g. ["owner","worker"]
───────────────────────────────────────────────────────────── */
const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return element;
};

/* ─────────────────────────────────────────────────────────────
   WorkerOnly — blocks a specific sub-route for workers
   Use this to protect /theater/settings from workers.
   Worker hitting a blocked route is sent to /theater/overview.
───────────────────────────────────────────────────────────── */
const OwnerOnly = ({ element }) => {
  const role = localStorage.getItem("role")?.toLowerCase();
  if (role === "worker") return <Navigate to="/theater/overview" replace />;
  return element;
};

/* ─────────────────────────────────────────────────────────────
   WorkerRedirect
   Worker entry point after login.
   Reads assignedTheaterId → redirects to /theater/overview.
   If missing → shows "No Theater Assigned" screen.
───────────────────────────────────────────────────────────── */
const WorkerRedirect = () => {
  const theaterId = localStorage.getItem("theaterId");

  if (theaterId) {
    return (
      <Navigate
        to="/theater/overview"
        state={{ theaterId }}
        replace
      />
    );
  }

  return <Navigate to="/theater/orders" replace />;
};

function App() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#/customer/")) {
      let cleanPath = hash.replace("#", "");
      
      // Fix malformed query strings with multiple '?'
      const parts = cleanPath.split("?");
      if (parts.length > 2) {
        const path = parts[0];
        const query = parts.slice(1).join("&");
        cleanPath = `${path}?${query}`;
      }

      // If it originally targeted menu but user wants welcome, swap it
      cleanPath = cleanPath.replace("/customer/menu", "/customer/welcome");

      // Redirect to the parsed path
      window.location.replace(cleanPath);
    }
  }, []);

  return (
    <Routes>

      {/* Default */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Auth — public */}
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />
      <Route path="/forgotpassword" element={<ForgotPassword />} />

      {/* Owner routes */}
      <Route path="/owner/home"       element={<PrivateRoute element={<OwnerHome />}       allowedRoles={["owner"]} />} />
      <Route path="/owner/plan"       element={<PrivateRoute element={<OwnerPlan />}       allowedRoles={["owner"]} />} />
      <Route path="/owner/payment"    element={<PrivateRoute element={<OwnerPayment />}    allowedRoles={["owner"]} />} />
      <Route path="/renew-plan"       element={<PrivateRoute element={<RenewPlan />}       allowedRoles={["owner"]} />} />
      <Route path="/theater-register" element={<PrivateRoute element={<TheaterRegister />} allowedRoles={["owner"]} />} />

      {/* Worker entry — reads assignedTheaterId, redirects to /theater/overview */}
      <Route path="/worker" element={<PrivateRoute element={<WorkerRedirect />} allowedRoles={["worker"]} />} />

      {/* Theater panel — owner AND worker, same layout, role controls visibility */}
      <Route
        path="/theater"
        element={<PrivateRoute element={<TheaterLayout />} allowedRoles={["owner","worker"]} />}
      >
        <Route index             element={<Navigate to="overview" replace />} />
        <Route path="overview"   element={<TheaterDashboard />} />
        <Route path="menu"       element={<Menu />} />
        <Route path="orders"     element={<Orders />} />
        <Route path="analytics"  element={<Analytics />} />
        <Route path="qr"         element={<QRGenerator />} />

        {/* Settings — owner only, worker redirected to overview */}
        <Route path="settings" element={<OwnerOnly element={<EditTheater />} />} />
      </Route>

      {/* Customer flow */}
      <Route path="/customer"         element={<CustomerWelcome />} />
      <Route path="/customer/welcome" element={<CustomerWelcome />} />
      <Route path="/customer/login"   element={<CustomerLogin />} />
      <Route path="/customer/menu"    element={<CustomerMenu />} />
      <Route path="/customer/cart"    element={<CustomerCart />} />
      <Route path="/customer/item"    element={<CustomerItemDetails />} />
      
      {/* Protected Customer Routes */}
      <Route path="/payment"          element={<PrivateRoute element={<PaymentPage />}   allowedRoles={["customer"]} />} />
      <Route path="/tracking"         element={<PrivateRoute element={<OrderTracking />} allowedRoles={["customer"]} />} />
      <Route path="/order-success"    element={<PrivateRoute element={<OrderSuccess />}  allowedRoles={["customer"]} />} />

      {/* Admin */}
      <Route path="/admin-login"      element={<AdminLogin />} />
      <Route path="/admin"            element={<AdminDashboard />} />
      <Route path="/admin-dashboard"  element={<AdminDashboard />} />

    </Routes>
  );
}

export default App;
