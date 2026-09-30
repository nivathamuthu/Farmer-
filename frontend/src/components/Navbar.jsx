import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { count } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const path = useLocation().pathname;
  const onFarmLogin = !(path.startsWith("/admin/") && path !== "/admin/login");
  const linkClass = onFarmLogin
    ? "rounded-full px-3 py-2 text-[#f4f0e2] hover:bg-white/15"
    : "rounded-full px-3 py-2 hover:bg-white";

  return (
    <header
      className={
        onFarmLogin
          ? "sticky top-0 z-30 border-b border-[#efe6c9]/25 bg-[#1c3316]/40 text-[#f4f0e2] backdrop-blur-md"
          : "sticky top-0 z-20 border-b border-sand/80 bg-paper/90 backdrop-blur"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="font-serif text-2xl tracking-tight">
          Nivis Farm
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <NavLink to="/" className={linkClass}>
            Shop
          </NavLink>
          <NavLink
            to="/cart"
            className={
              onFarmLogin
                ? "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f4f0e2] hover:bg-white/15"
                : "relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white"
            }
            aria-label={`Cart, ${count} items`}
            title="Cart"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6h15l-1.5 9h-12L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="20" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            <span
              className={
                onFarmLogin
                  ? "absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-[#efe6c9] px-1.5 text-center text-[11px] leading-5 text-[#1c3316]"
                  : "absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-leaf px-1.5 text-center text-[11px] leading-5 text-white"
              }
            >
              {count}
            </span>
          </NavLink>
          {isAuthenticated ? (
            <>
              {onFarmLogin ? (
                <NavLink
                  to="/admin/products"
                  className={
                    onFarmLogin
                      ? "inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f4f0e2] hover:bg-white/15"
                      : "inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white"
                  }
                  aria-label="Admin"
                  title="Admin"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                  </svg>
                </NavLink>
              ) : (
                <>
                  <NavLink to="/admin/products" className={linkClass}>
                    Products
                  </NavLink>
                  <NavLink to="/admin/orders" className={linkClass}>
                    Customers
                  </NavLink>
                </>
              )}
              <button
                type="button"
                className={onFarmLogin ? "inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f4f0e2] hover:bg-white/15" : "btn-ghost h-10 w-10 px-0"}
                onClick={logout}
                aria-label="Log out"
                title="Log out"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M9 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" strokeLinecap="round" />
                  <path d="M14 16l4-4-4-4M10 12h8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : (
            <NavLink
              to="/admin/login"
              className={
                onFarmLogin
                  ? "inline-flex h-10 w-10 items-center justify-center rounded-full text-[#f4f0e2] hover:bg-white/15"
                  : "inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white"
              }
              aria-label="Admin"
              title="Admin"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
              </svg>
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
