import React, { useState, useEffect } from "react";
// MODIFIED: Import the one true category list
import { categories as hardCodedCategories } from "../../constants";

const SearchBar = ({
  onSearch,
  onCategoryChange,
  onPriceChange,
  initialQuery = "",
  activeCategory = "all", // MODIFIED: Default to 'all'
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(activeCategory);
  const [priceSort, setPriceSort] = useState("relevance");

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setCategory(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query !== initialQuery) {
        onSearch(query);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [query, onSearch, initialQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    onCategoryChange(newCategory);
  };

  const handlePriceChange = (e) => {
    const newSort = e.target.value;
    setPriceSort(newSort);
    onPriceChange(newSort);
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="flex flex-wrap items-center gap-4 mb-8 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-emerald-200/60 dark:border-emerald-700/40"
    >
      <div className="relative flex-1 min-w-[250px]">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          search
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent border border-emerald-200/60 dark:border-emerald-700/40 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 focus:outline-none transition-shadow text-gray-900 dark:text-gray-100"
          placeholder="Search for products or farmers..."
        />
      </div>

      <select
        value={category}
        onChange={handleCategoryChange}
        className="bg-transparent border border-emerald-200/60 dark:border-emerald-700/40 rounded-lg py-2 px-4 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 focus:outline-none transition-shadow text-gray-900 dark:text-gray-100"
      >
        {/* MODIFIED: Dynamic categories */}
        <option value="all">All Categories</option>
        {hardCodedCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={priceSort}
        onChange={handlePriceChange}
        className="bg-transparent border border-emerald-200/60 dark:border-emerald-700/40 rounded-lg py-2 px-4 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 focus:outline-none transition-shadow text-gray-900 dark:text-gray-100"
      >
        <option value="relevance">Sort: Relevance</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
      </select>
    </form>
  );
};

export default SearchBar;
