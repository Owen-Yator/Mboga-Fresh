import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import CartPreview from "./CartPreview";
import { DEFAULT_AVATAR } from "../constants";

const Header = ({ avatarUrl } = {}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [signupDropdownOpen, setSignupDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const signupDropdownRef = useRef(null);

  // cart context
  const { count, items } = useCart?.() ?? { count: 0, items: [] };
  const [cartOpen, setCartOpen] = useState(false);
  const prevCountRef = useRef(count);

  useEffect(() => {
    const prev = prevCountRef.current;
    if (count > prev) {
      setCartOpen(true);
      const t = setTimeout(() => setCartOpen(false), 4000);
      return () => clearTimeout(t);
    }
    prevCountRef.current = count;
  }, [count]);

  // Close signup dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (signupDropdownRef.current && !signupDropdownRef.current.contains(event.target)) {
        setSignupDropdownOpen(false);
      }
    };
    if (signupDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [signupDropdownOpen]);

  // build navigation based on role
  const role = user?.role ?? "guest";
  const baseLinks = [
    { name: "Home", to: "/" },
    { name: "Marketplace", to: "/marketplace" },
    { name: "Orders", to: "/orders" },
    { name: "Help", to: "/help" },
  ];
  if (role === "vendor")
    baseLinks.splice(2, 0, {
      name: "Vendor Dashboard",
      to: "/vendordashboard",
    });
  if (role === "rider")
    baseLinks.splice(2, 0, { name: "Rider", to: "/riderdashboard" });
  if (role === "farmer" || role === "supplier")
    baseLinks.splice(2, 0, { name: "Supplier", to: "/supplierdashboard" });

  const handleSubmitSearch = (e) => {
    e?.preventDefault?.();
    const trimmed = (query || "").trim();
    navigate(
      `/marketplace${trimmed ? `?query=${encodeURIComponent(trimmed)}` : ""}`
    );
  };

  // Final avatar selection: priority
  // 1) avatarUrl prop (explicit)
  // 2) user.avatar or user.avatarUrl
  // 3) DEFAULT_AVATAR import
  // 4) built-in fallback
  const builtInFallback =
    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=512&h=512&fit=crop&auto=format";
  const avatarSrc =
    avatarUrl ||
    user?.avatar ||
    user?.avatarUrl ||
    (typeof DEFAULT_AVATAR === "string" && DEFAULT_AVATAR) ||
    builtInFallback;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-24 items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate("/")}
                aria-label="Go to home"
                className="flex items-center gap-2"
              >
                <svg
                  className="h-10 w-10 text-emerald-600"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tighter">
                  Mboga Fresh
                </span>
              </button>

              <nav
                className="hidden lg:flex items-center gap-8"
                aria-label="Main navigation"
              >
                {baseLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      `text-base font-medium transition-colors ${
                        isActive
                          ? "text-emerald-700 border-emerald-700 pb-1"
                          : "text-gray-700 dark:text-gray-300 hover:text-emerald-700"
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <form
                onSubmit={handleSubmitSearch}
                className="relative hidden md:block"
                role="search"
              >
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
                  />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full max-w-xs rounded-full border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 py-2.5 pl-10 pr-6 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                  placeholder="Search produce, vendors..."
                  type="search"
                  aria-label="Search produce and vendors"
                />
              </form>

              <button
                onClick={() => navigate("/cart")}
                className="relative p-1 rounded-md"
                aria-label="Open cart page"
                title="Cart"
              >
                <svg
                  className="h-8 w-8 text-gray-600 dark:text-gray-300 hover:text-emerald-700 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 7M7 13l-2 5m5-5v5m4-5v5m4-5l2 5"
                  />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>

              {user ? (
                <>
                  <div className="hidden lg:flex items-center gap-3">
                    <div className="text-right mr-2">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {user.name ?? user.fullName ?? user.username}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.role ?? "buyer"}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/profile")}
                      aria-label="Open profile"
                      title="Profile"
                      className="group"
                    >
                      <div
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-12 h-12 ring-2 ring-transparent group-hover:ring-emerald-600 transition-all"
                        style={{ backgroundImage: `url('${avatarSrc}')` }}
                      />
                    </button>
                  </div>
                  <div className="lg:hidden">
                    <button
                      onClick={() => setMobileOpen((s) => !s)}
                      className="text-gray-600 dark:text-gray-300 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-expanded={mobileOpen}
                      aria-controls="mobile-menu"
                      aria-label="Toggle menu"
                    >
                      <span className="material-symbols-outlined text-3xl">
                        menu
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/login")}
                    className="hidden lg:inline-block px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    Sign in
                  </button>
                  
                  {/* Signup Dropdown */}
                  <div className="hidden lg:block relative ml-2" ref={signupDropdownRef}>
                    <button
                      onClick={() => setSignupDropdownOpen(!signupDropdownOpen)}
                      className="px-3 py-2 rounded-md border border-emerald-600 text-emerald-600 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-1"
                    >
                      Sign up
                      <svg
                        className={`w-4 h-4 transition-transform ${signupDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {signupDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                        <button
                          onClick={() => {
                            navigate("/signup/buyer");
                            setSignupDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-xl">shopping_cart</span>
                          <span className="text-sm font-medium">Buyer</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate("/signup/vendor");
                            setSignupDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-xl">store</span>
                          <span className="text-sm font-medium">Vendor</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate("/signup/farmer");
                            setSignupDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-xl">agriculture</span>
                          <span className="text-sm font-medium">Farmer</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate("/signup/rider");
                            setSignupDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-xl">two_wheeler</span>
                          <span className="text-sm font-medium">Rider</span>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="lg:hidden">
                    <button
                      onClick={() => setMobileOpen((s) => !s)}
                      className="text-gray-600 dark:text-gray-300 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-expanded={mobileOpen}
                      aria-controls="mobile-menu"
                      aria-label="Toggle menu"
                    >
                      <span className="material-symbols-outlined text-3xl">
                        menu
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          id="mobile-menu"
          className={`lg:hidden border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 transition-[max-height] overflow-hidden ${
            mobileOpen ? "max-h-[500px]" : "max-h-0"
          }`}
          aria-hidden={!mobileOpen}
        >
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col gap-3" aria-label="Mobile navigation">
              {baseLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? "text-emerald-700 bg-gray-100 dark:bg-gray-800"
                        : "text-gray-700 dark:text-gray-300"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
              <form
                onSubmit={handleSubmitSearch}
                className="mt-2"
                role="search"
              >
                <label htmlFor="mobile-search" className="sr-only">
                  Search
                </label>
                <div className="relative">
                  <input
                    id="mobile-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search produce, vendors..."
                    className="w-full rounded-full border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 py-2.5 pl-4 pr-10 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white text-sm"
                  >
                    Go
                  </button>
                </div>
              </form>
            </nav>
          </div>
        </div>
      </header>

      {cartOpen && <CartPreview onClose={() => setCartOpen(false)} />}
      {!cartOpen && items?.length > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed right-3 bottom-24 z-40 rounded-full bg-emerald-600 text-white p-3 shadow-lg"
          aria-label="Open cart preview"
          title="Open cart"
        >
          <span className="material-symbols-outlined">shopping_cart</span>
        </button>
      )}
    </>
  );
};

export default Header;
