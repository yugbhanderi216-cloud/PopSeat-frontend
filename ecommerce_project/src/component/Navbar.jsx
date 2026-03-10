import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar navbar-dark bg-dark px-3">
      <Link className="navbar-brand" to="/cafe">CafeApp</Link>

      <div>
        <Link className="text-white me-3" to="/order">Order</Link>
        <Link className="text-white me-3" to="/customer">Customer</Link>
      </div>
    </nav>
  );
}
