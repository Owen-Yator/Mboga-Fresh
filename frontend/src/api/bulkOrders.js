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

// --- VENDOR (BUYER) FUNCTIONS ---

export const fetchMyBulkOrders = () => {
  return handleResponse(
    axios.get(`${API_BASE}/api/bulk-orders/my-orders`, {
      withCredentials: true,
    })
  );
};

export const placeBulkOrderRequest = (payload) => {
  return handleResponse(
    axios.post(`${API_BASE}/api/bulk-orders/place`, payload, {
      withCredentials: true,
    })
  );
};

// --- FARMER (SELLER) FUNCTIONS ---

export const fetchFarmerBulkOrders = () => {
  return handleResponse(
    axios.get(`${API_BASE}/api/bulk-orders/farmer-orders`, {
      withCredentials: true,
    })
  );
};

export const acceptBulkOrder = (orderId) => {
  return handleResponse(
    axios.patch(
      `${API_BASE}/api/bulk-orders/${orderId}/accept`,
      {},
      {
        withCredentials: true,
      }
    )
  );
};

// --- SHARED FUNCTION ---

export const fetchBulkOrderTask = (orderId) => {
  return handleResponse(
    axios.get(`${API_BASE}/api/bulk-orders/${orderId}/task`, {
      withCredentials: true,
    })
  );
};

// --- ADMIN FUNCTION ---

export const fetchAllBulkOrders = () => {
  return handleResponse(
    axios.get(`${API_BASE}/api/bulk-orders/admin/all`, {
      withCredentials: true,
    })
  );
};
