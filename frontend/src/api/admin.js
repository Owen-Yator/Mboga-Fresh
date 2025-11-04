// frontend/src/api/admin.js
import axios from "axios";

const BASE_URL = "/api/admin";

// Helper function
async function handleResponse(request) {
  try {
    const res = await request;
    return res.data;
  } catch (err) {
    console.error("API Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message || "API Error");
  }
}

/**
 * Fetches all products (retail and bulk) for the Admin panel.
 */
export const fetchAdminProducts = async (type = "all", q = "") => {
  return handleResponse(
    axios.get(`${BASE_URL}/products`, {
      params: { type, q },
      withCredentials: true,
    })
  );
};

/**
 * Updates the status (Suspended/In Stock) of a specific product.
 */
export const updateProductStatus = async (id, type, isSuspended) => {
  const urlType = type.toLowerCase();
  return handleResponse(
    axios.patch(
      `${BASE_URL}/products/${urlType}/${id}/status`,
      { isSuspended },
      { withCredentials: true }
    )
  );
};

/**
 * Fetches all analytics data for the Reports page
 * @param {string} period 'daily', 'weekly', or 'monthly'
 */
export const fetchAnalyticsSummary = async (period = "monthly") => {
  return handleResponse(
    axios.get(`${BASE_URL}/reports/summary`, {
      params: { period },
      withCredentials: true,
    })
  );
};

// --- NEW FUNCTIONS FOR ADMIN DASHBOARD ---

/**
 * Fetches user stats (total users, growth, role counts).
 */
export const fetchUserStats = () => {
  return handleResponse(
    axios.get(`${BASE_URL}/stats`, { withCredentials: true })
  );
};

/**
 * Fetches the total balance currently held in escrow.
 */
export const fetchTotalEscrowBalance = () => {
  return handleResponse(
    axios.get(`${BASE_URL}/escrow-balance`, { withCredentials: true })
  );
};

/**
 * Fetches a list of all completed transactions.
 */
export const fetchAllTransactions = () => {
  return handleResponse(
    axios.get(`${BASE_URL}/transactions`, { withCredentials: true })
  );
};

/**
 * Fetches data for the daily delivery chart.
 */
export const fetchDeliveryChartData = () => {
  return handleResponse(
    axios.get(`${BASE_URL}/reports/deliveries`, { withCredentials: true })
  );
};
