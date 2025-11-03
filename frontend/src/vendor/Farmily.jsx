import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/vendorComponents/Header";
import Sidebar from "../components/vendorComponents/Sidebar";
import SearchBar from "../components/vendorComponents/SearchBar";
import ProductCard from "../components/vendorComponents/ProductCard";
import VendorCart from "../components/vendorComponents/VendorCart";
import { fetchBulkProducts } from "../api/bulkProducts";
import { useAuth } from "../context/AuthContext";
import { useBulkCart } from "../context/BulkCartContext";
import { Loader2 } from "lucide-react";
import Pagination from "../components/Pagination";

// MODIFIED: Lazily load the sub-pages
const BulkOrdersList = React.lazy(() => import("../vendor/BulkOrdersList"));
const VendorCartPage = React.lazy(() => import("../vendor/VendorCartPage"));

const API_BASE = import.meta.env.VITE_API_BASE || "";
const placeholder = "https://img.icons8.com/color/96/000000/cucumber.png";

const resolveImage = (imagePath) => {
  if (!imagePath || imagePath.startsWith("http"))
    return imagePath || placeholder;
  return `${API_BASE.replace(/\/$/, "")}${
    imagePath.startsWith("/") ? imagePath : `/${imagePath}`
  }`;
};

// --- Product Grid Component ---
// This is the component for the default view
const ProductGrid = () => {
  const { addItem } = useBulkCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [productData, setProductData] = useState({
    products: [],
    totalPages: 1,
    currentPage: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCartVisible, setIsCartVisible] = useState(false);

  const updateQuery = useCallback(
    (key, value) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev);
          if (value) {
            newParams.set(key, value);
          } else {
            newParams.delete(key);
          }
          if (key !== "page") {
            newParams.delete("page");
          }
          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    const loadBulkProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {};
        for (const [key, value] of searchParams.entries()) {
          params[key] = value;
        }

        if (!params.page) params.page = "1";
        if (params.category === "all") delete params.category;
        if (params.sortBy === "relevance") delete params.sortBy;
        if (!params.status) params.status = "In Stock"; // Default

        const data = await fetchBulkProducts(params);

        if (data && Array.isArray(data.products)) {
          setProductData(data);
        } else {
          setProductData({ products: [], totalPages: 1, currentPage: 1 });
        }
      } catch (err) {
        console.error("Failed to fetch bulk products:", err);
        setError("Failed to load products");
        setProductData({ products: [], totalPages: 1, currentPage: 1 });
      } finally {
        setLoading(false);
      }
    };

    loadBulkProducts();
  }, [searchParams]);

  const handleAddToCart = (product) => {
    const cartProduct = {
      id: product.__raw._id,
      title: product.title,
      price: product.price,
      image: product.image,
      farmer: product.farmer,
      __raw: product.__raw,
    };
    addItem(cartProduct, 1);
    setIsCartVisible(true);
    setTimeout(() => setIsCartVisible(false), 3000);
  };

  const handleSearch = (query) => {
    updateQuery("q", query);
  };

  const handleCategoryChange = (category) => {
    updateQuery("category", category === "All Categories" ? "all" : category);
  };

  const handlePriceChange = (sort) => {
    updateQuery(
      "sortBy",
      sort === "Price Range" || sort === "relevance" ? "" : sort
    );
  };

  const handlePageChange = (newPage) => {
    updateQuery("page", newPage);
  };

  const searchQuery = searchParams.get("q") || "";
  const categoryFilter = searchParams.get("category") || "all";
  const priceFilter = searchParams.get("sortBy") || "relevance";

  const formattedProducts = productData.products.map((p) => ({
    id: p._id || p.id,
    title: p.name || "Untitled Product",
    farmer: p.ownerName || "Farmer",
    price: p.priceLabel || `KES ${p.price}`,
    image: resolveImage(p.imagePath || p.image),
    category: p.category || "Uncategorized",
    __raw: p,
  }));

  const { items: cartItems } = useBulkCart();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Farm-ily Marketplace
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Explore bulk farm products directly from farmers.
        </p>
      </div>

      <SearchBar
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        onPriceChange={handlePriceChange}
        initialQuery={searchQuery}
        activeCategory={categoryFilter}
        priceSort={priceFilter}
      />

      {loading ? (
        <div className="py-10 text-center text-gray-600 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          Loading farmily products...
        </div>
      ) : error ? (
        <div className="py-10 text-center text-red-600">{error}</div>
      ) : formattedProducts.length === 0 ? (
        <div className="py-10 text-center text-gray-600 dark:text-gray-400">
          No products found for this category or search.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
            {formattedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAdd={() => handleAddToCart(p)}
              />
            ))}
          </div>
          <Pagination
            currentPage={productData.currentPage}
            totalPages={productData.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {isCartVisible && cartItems.length > 0 && (
        <div className="fixed top-1/4 right-0 z-50 transition-transform duration-300">
          <VendorCart onClose={() => setIsCartVisible(false)} />
        </div>
      )}

      {cartItems.length > 0 && !isCartVisible && (
        <button
          onClick={() => setIsCartVisible(true)}
          className="fixed bottom-10 right-10 bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:bg-emerald-700 transition"
        >
          <div className="relative">
            <span className="material-symbols-outlined text-2xl">
              shopping_cart
            </span>
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
              {cartItems.length}
            </span>
          </div>
        </button>
      )}
    </>
  );
};
// --- End Product Grid Component ---

// This is the main Hub component
const Farmily = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get("view");

  // This function decides which component to show on the right
  const renderView = () => {
    switch (currentView) {
      case "cart":
        return <VendorCartPage />;
      case "orders":
        return <BulkOrdersList />;
      default:
        return <ProductGrid />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header avatarUrl={user?.avatar} userName={user?.name || "Vendor"} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <Suspense
            fallback={<Loader2 className="w-6 h-6 animate-spin mx-auto" />}
          >
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Farmily;
