import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
// MODIFIED: Import the one true category list
import { categories as hardCodedCategories } from "../../constants";

const Sidebar = ({ className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // Get the current "view" (products, cart, or orders)
  const activeView = params.get("view") || "products";
  // Get the current category filter
  const activeCategory = params.get("category") || "all";

  // MODIFIED: This function now sets the URL params
  const setView = (viewName) => {
    navigate(`/farmily?view=${viewName}`);
  };

  const goToCategory = (categoryId) => {
    if (categoryId === "all") {
      navigate("/farmily"); // No params for all products
    } else {
      navigate(`/farmily?category=${encodeURIComponent(categoryId)}`);
    }
  };

  const linkClass = (isActive) =>
    `w-full text-left flex items-center gap-3 px-4 py-2 rounded-lg transition-colors font-medium 
    ${
      isActive
        ? "bg-emerald-100 dark:bg-emerald-700/20 text-emerald-600"
        : "text-gray-800 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-700/10"
    }`;

  return (
    <aside
      className={`w-80 flex-shrink-0 border-r border-emerald-200/70 dark:border-emerald-700/60 p-6 bg-white dark:bg-gray-900 ${className}`}
    >
      <div className="flex flex-col gap-8">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Farm-ily Marketplace
        </h1>

        <nav className="flex flex-col gap-2" aria-label="Product categories">
          <span className="text-xs font-semibold text-gray-500 mb-1">
            PRODUCT CATEGORIES
          </span>

          <button
            key="all"
            onClick={() => goToCategory("all")}
            // MODIFIED: Pass the boolean directly
            className={linkClass(
              activeView === "products" && activeCategory === "all"
            )}
          >
            <span className="material-symbols-outlined" aria-hidden>
              grid_view
            </span>
            <span>All Products</span>
          </button>

          {hardCodedCategories.map((c) => {
            const isActive =
              activeView === "products" && activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => goToCategory(c.id)}
                // MODIFIED: Pass the boolean directly
                className={linkClass(isActive)}
                aria-current={isActive ? "true" : undefined}
              >
                {c.icon && (
                  <span className="material-symbols-outlined" aria-hidden>
                    {c.icon}
                  </span>
                )}
                <span>{c.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-emerald-200/60 dark:border-emerald-700/40 my-4" />

        <nav className="flex flex-col gap-2" aria-label="Bulk Management Links">
          <span className="text-xs font-semibold text-gray-500 mb-1">
            MANAGE ORDERS & CART
          </span>

          <button
            onClick={() => setView("cart")}
            // MODIFIED: Pass the boolean directly
            className={linkClass(activeView === "cart")}
          >
            <span className="material-symbols-outlined">shopping_cart</span>
            <span>My Bulk Cart</span>
          </button>

          <button
            onClick={() => setView("orders")}
            // MODIFIED: Pass the boolean directly
            className={linkClass(activeView === "orders")}
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span>Bulk Orders</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
