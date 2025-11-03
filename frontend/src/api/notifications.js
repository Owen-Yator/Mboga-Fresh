import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const API_URL_BASE = `${API_BASE}/api/orders`; // Your notification routes are in order.route.js

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
 * Fetches all notifications for the logged-in user.
 */
export const fetchNotifications = () => {
  return handleResponse(
    axios.get(`${API_URL_BASE}/notifications`, { withCredentials: true })
  );
};

/**
 * Marks a single notification as read.
 */
export const markNotificationAsRead = (notificationId) => {
  return handleResponse(
    axios.patch(
      `${API_URL_BASE}/notifications/${notificationId}/read`,
      {},
      { withCredentials: true }
    )
  );
};

/**
 * Deletes all notifications marked as read for the current user.
 */
export const deleteReadNotifications = () => {
  return handleResponse(
    axios.delete(`${API_URL_BASE}/notifications/read`, {
      withCredentials: true,
    })
  );
};
