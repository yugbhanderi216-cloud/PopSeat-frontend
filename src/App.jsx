import { Routes, Route, Navigate } from "react-router-dom";

import Login          from "./pages/auth/Login";
import Register       from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

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
const PrivateRoute = ({ element, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role")?.toLowerCase();
  if (!token)                                      return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" replace />;
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
  const assignedTheaterId = localStorage.getItem("assignedTheaterId");

  if (!assignedTheaterId) {
    return (
      <div style={{
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", minHeight:"100vh",
        fontFamily:"'Plus Jakarta Sans',sans-serif",
        background:"#F2F0FF", color:"#1A1740",
        gap:14, padding:20, textAlign:"center",
      }}>
        <div style={{ fontSize:56 }}>👷</div>
        <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, margin:0 }}>
          No Theater Assigned
        </h2>
        <p style={{ color:"#6B6891", fontSize:14, maxWidth:340, margin:0, lineHeight:1.6 }}>
          Your account has no theater linked yet.<br />
          Ask your owner to assign you to a theater, then log in again.
        </p>
        <button
          onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
          style={{
            marginTop:8, padding:"10px 28px",
            background:"#6C63FF", color:"white",
            border:"none", borderRadius:8,
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            fontWeight:700, fontSize:13, cursor:"pointer",
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <Navigate
      to="/theater/overview"
      state={{ theaterId: assignedTheaterId }}
      replace
    />
  );
};

function App() {
  return (
    <Routes>

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />

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

      {/* Customer flow — public */}
      <Route path="/customer"  element={<CustomerWelcome />} />
      <Route path="/customer/login"  element={<CustomerLogin />} />
      <Route path="/customer/menu"   element={<CustomerMenu />} />
      <Route path="/customer/cart"   element={<CustomerCart />} />
      <Route path="/customer/item"   element={<CustomerItemDetails />} />
      <Route path="/payment"         element={<PaymentPage />} />
      <Route path="/tracking"        element={<OrderTracking />} />
      <Route path="/order-success"   element={<OrderSuccess />} />

      {/* Admin */}
      <Route path="/admin-login"      element={<AdminLogin />} />
      <Route path="/admin"            element={<AdminDashboard />} />
      <Route path="/admin-dashboard"  element={<AdminDashboard />} />

    </Routes>
  );
}

export default App;