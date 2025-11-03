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

// --- B2B (FARMILY) VENDOR ORDER FUNCTIONS ---

// For a VENDOR to fetch the bulk orders THEY placed
export const fetchMyBulkOrders = () => {
  return handleResponse(
    axios.get(`${API_BASE}/api/bulk-orders/my-orders`, {
      withCredentials: true,
    })
  );
};

// For a VENDOR to place a new bulk order
export const placeBulkOrderRequest = (payload) => {
  return handleResponse(
    axios.post(`${API_BASE}/api/bulk-orders/place`, payload, {
      withCredentials: true,
    })
  );
};

// For a FARMER to get orders they need to FULFILL
export const fetchFarmerBulkOrders = () => {
  return handleResponse(
    axios.get(`${API_BASE}/api/bulk-orders/farmer-orders`, {
      withCredentials: true,
    })
  );
};
