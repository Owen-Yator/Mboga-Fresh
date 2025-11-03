import React, { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import Header from "../components/FarmerComponents/Header";
import { useAuth } from "../context/AuthContext";
// MODIFIED: Import new API functions
import {
  fetchFarmerBulkOrders,
  acceptBulkOrder,
  fetchBulkOrderTask,
} from "../api/bulkOrders";
import { Loader2 } from "lucide-react";

// --- Helper Functions ---
const formatCurrency = (amount) =>
  `Ksh ${Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;

const getStatusColor = (status) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-700";
    case "QR Scanning":
      return "bg-emerald-100 text-emerald-700";
    case "In Transit":
      return "bg-blue-100 text-blue-700";
    case "Delivered":
      return "bg-green-100 text-green-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getPaymentColor = (payment) => {
  switch (payment) {
    case "Paid":
    case "Escrow":
      return "bg-green-100 text-green-700";
    default:
      return "bg-red-100 text-red-700";
  }
};

const getActionButton = (action) => {
  if (action === "View Details") {
    return "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50";
  } else if (action === "Accept Order" || action === "Show QR Code") {
    return "bg-emerald-600 text-white hover:bg-emerald-700";
  } else {
    return "bg-gray-100 text-gray-600 cursor-not-allowed";
  }
};
// --- End Helper Functions ---

export default function OrderManagement() {
  const { user, loadingAuth } = useAuth();
  const [activeTab, setActiveTab] = useState("new");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQrCodeModal, setShowQrCodeModal] = useState(false);
  const [qrCodeOrder, setQrCodeOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // Stores ID of order being processed

  // MODIFIED: Load real orders from API
  const loadFarmerOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setApiError(null);
    try {
      const data = await fetchFarmerBulkOrders();

      const mappedOrders = data.map((order) => {
        const currentStatus = order.orderStatus;
        let action = "View Details";
        if (currentStatus === "Pending") action = "Accept Order";
        else if (currentStatus === "QR Scanning") action = "Show QR Code";

        const itemsList =
          order.items?.map((i) => `${i.quantity}x ${i.name}`).join(", ") ||
          "Items missing";

        let paymentStatus = "Unpaid";
        if (
          order.paymentStatus === "Paid" ||
          order.paymentStatus === "Escrow"
        ) {
          paymentStatus = currentStatus === "Delivered" ? "Paid" : "Escrow";
        }

        return {
          id: order._id,
          buyer:
            order.vendorId?.name ||
            `Vendor #${order.vendorId._id.substring(18)}`,
          items: itemsList,
          amount: formatCurrency(order.totalAmount),
          status: currentStatus,
          payment: paymentStatus,
          action: action,
          __raw: order, // Keep raw data for details modal
        };
      });

      setOrders(mappedOrders);
    } catch (err) {
      console.error("Failed to load farmer orders:", err);
      setApiError("Failed to fetch orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !loadingAuth) {
      loadFarmerOrders();
    }
  }, [user, loadingAuth, loadFarmerOrders]);

  // MODIFIED: handleAction is now async and calls the API
  const handleAction = async (order) => {
    setApiError(null);
    setActionLoading(order.id); // Set loading for this specific button

    if (order.action === "Accept Order") {
      if (
        !window.confirm(
          `Accept Order #${order.id
            .substring(18)
            .toUpperCase()}? This will generate a pickup code.`
        )
      ) {
        setActionLoading(null);
        return;
      }

      try {
        const { task } = await acceptBulkOrder(order.id);

        await loadFarmerOrders(); // Refresh the list
        setActiveTab("qr"); // Switch to the QR tab

        setQrCodeOrder({ ...order, pickupCode: task.pickupCode });
        setShowQrCodeModal(true);
      } catch (err) {
        console.error("Order Acceptance Failed:", err);
        setApiError(err.message || "Failed to accept order.");
      }
    } else if (order.action === "Show QR Code") {
      try {
        const task = await fetchBulkOrderTask(order.id);
        if (!task.pickupCode) {
          throw new Error("Could not find pickup code for this task.");
        }
        setQrCodeOrder({ ...order, pickupCode: task.pickupCode });
        setShowQrCodeModal(true);
      } catch (err) {
        console.error("Failed to fetch task for QR Code:", err);
        setApiError(err.message || "Failed to retrieve QR Code data.");
      }
    } else if (order.action === "View Details") {
      setSelectedOrder(order);
    }

    setActionLoading(null);
  };

  // (This is still a simulation, needs a real backend endpoint)
  const handleMarkAsDelivered = (orderId) => {
    console.warn("Simulating Mark as Delivered for:", orderId);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "Delivered",
              action: "View Details",
              payment: "Paid",
            }
          : o
      )
    );
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "new") return order.status === "Pending";
    if (activeTab === "qr") return order.status === "QR Scanning";
    if (activeTab === "delivery") return order.status === "In Transit";
    if (activeTab === "completed")
      return order.status === "Delivered" || order.status === "Cancelled";
    return true;
  });

  const getTabCount = (tab) => {
    if (tab === "new")
      return orders.filter((o) => o.status === "Pending").length;
    if (tab === "qr")
      return orders.filter((o) => o.status === "QR Scanning").length;
    if (tab === "delivery")
      return orders.filter((o) => o.status === "In Transit").length;
    if (tab === "completed")
      return orders.filter(
        (o) => o.status === "Delivered" || o.status === "Cancelled"
      ).length;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        avatarUrl={user?.avatar || ""}
        userName={user?.name || "Supplier"}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Management
          </h1>
          <p className="text-gray-600">
            Manage your incoming bulk orders from vendors.
          </p>
          {apiError && (
            <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-lg">
              {apiError}
            </div>
          )}
        </div>

        <div className="flex space-x-8 border-b border-gray-200 mb-6">
          {[
            {
              id: "new",
              label: "New Orders",
              icon: "M12 6v6m0 0v6m0-6h6m-6 0H6",
            },
            {
              id: "qr",
              label: "Awaiting Pickup",
              icon: "M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z",
            },
            {
              id: "delivery",
              label: "In Transit",
              icon: "M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9",
            },
            {
              id: "completed",
              label: "Completed",
              icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 relative ${
                activeTab === tab.id
                  ? "text-green-600 font-medium"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={tab.icon}
                  />
                </svg>
                <span>{tab.label}</span>
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {getTabCount(tab.id)}
                </span>
              </div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-12 text-gray-600">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Fetching orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              No {activeTab} orders to display.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer (Vendor)
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                      {order.id.substring(18).toUpperCase()}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {order.buyer}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {order.items}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                      {order.amount}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPaymentColor(
                          order.payment
                        )}`}
                      >
                        {order.payment}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {order.status !== "Delivered" &&
                        order.status !== "Cancelled" && (
                          <button
                            onClick={() => handleAction(order)}
                            disabled={actionLoading === order.id}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${getActionButton(
                              order.action
                            )} disabled:opacity-50`}
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              order.action
                            )}
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* QR Code Display Modal */}
      {showQrCodeModal && qrCodeOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md relative">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
              Rider Pickup Code
            </h2>
            <p className="text-gray-600 text-sm mb-6 text-center">
              Show this QR code to the Rider to scan
            </p>
            <div className="flex justify-center mb-6 bg-white p-4 rounded">
              <QRCodeCanvas
                value={JSON.stringify({
                  type: "BULK_PICKUP", // Use a distinct type
                  code: qrCodeOrder.pickupCode || "NO-CODE",
                  orderId: qrCodeOrder.id,
                })}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-gray-700">
                Order: #{qrCodeOrder.id.substring(18).toUpperCase()}
              </p>
              <p className="text-4xl font-bold text-gray-900 tracking-widest my-2">
                {qrCodeOrder.pickupCode}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowQrCodeModal(false);
                  setQrCodeOrder(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Order Details
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedOrder.id.substring(18).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Buyer (Vendor)</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedOrder.buyer}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Items</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedOrder.items}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedOrder.amount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPaymentColor(
                      selectedOrder.payment
                    )}`}
                  >
                    {selectedOrder.payment}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Status</p>
                <span
                  className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status}
                </span>
              </div>
              {selectedOrder.status === "In Transit" && (
                <button
                  onClick={() => {
                    handleMarkAsDelivered(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                  className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                >
                  Simulate: Mark as Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
