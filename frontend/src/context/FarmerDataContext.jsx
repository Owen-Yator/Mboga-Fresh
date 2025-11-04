import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchFarmerDashboardMetrics } from "../api/farmer";
import { fetchFarmerBulkOrders } from "../api/bulkOrders";
import {
  fetchNotifications,
  markNotificationAsRead,
  deleteReadNotifications,
} from "../api/notifications";

const FarmerDataContext = createContext();

// --- THIS IS THE FIX ---
// Changed from 'export const useFarmerData = () => {'
export function useFarmerData() {
  const ctx = useContext(FarmerDataContext);
  if (!ctx) {
    throw new Error("useFarmerData must be used within a FarmerDataProvider");
  }
  return ctx;
}
// --- END OF FIX ---

export const FarmerDataProvider = ({ children }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    ordersReceived: 0,
    pendingAcceptance: 0,
    pendingDeliveries: 0,
    salesInEscrow: 0,
    earningsReleased: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const balances = React.useMemo(() => {
    let escrow = 0;
    let available = 0;
    let earnings = 0;

    transactions.forEach((order) => {
      if (order.orderStatus === "Delivered") {
        available += order.totalAmount;
        earnings += order.totalAmount;
      } else if (
        order.orderStatus !== "Cancelled" &&
        order.paymentStatus === "Escrow"
      ) {
        escrow += order.totalAmount;
      }
    });

    return { escrow, available, earnings };
  }, [transactions]);

  const loadAllFarmerData = useCallback(async () => {
    if (!user || user.role !== "farmer") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [metrics, orders, notifs] = await Promise.all([
        fetchFarmerDashboardMetrics(),
        fetchFarmerBulkOrders(),
        fetchNotifications(),
      ]);

      setDashboardData(metrics);
      setTransactions(orders);
      setNotifications(notifs);
    } catch (err) {
      console.error("Failed to load farmer data:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllFarmerData();
  }, [loadAllFarmerData]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleDeleteRead = async () => {
    try {
      await deleteReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
    } catch (err) {
      console.error("Failed to delete read notifications:", err);
    }
  };

  const handleWithdraw = (amount, mpesaNumber) => {
    console.log(`Simulating withdrawal of ${amount} to ${mpesaNumber}`);
    alert("Withdrawal simulation. Check console.");
    return true;
  };

  const value = {
    dashboardData,
    transactions,
    notifications,
    loading,
    error,
    unreadCount,
    balances,
    loadAllFarmerData,
    markNotificationAsRead: handleMarkAsRead,
    deleteReadNotifications: handleDeleteRead,
    handleWithdraw,
  };

  return (
    <FarmerDataContext.Provider value={value}>
      {children}
    </FarmerDataContext.Provider>
  );
};
