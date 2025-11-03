import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "";

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
 * Fetches the calculated dashboard metrics for the logged-in farmer.
 */
export const fetchFarmerDashboardMetrics = () => {
  return handleResponse(
    axios.get(`${API_BASE}/api/farmer/dashboard-metrics`, {
      withCredentials: true,
    })
  );
};
