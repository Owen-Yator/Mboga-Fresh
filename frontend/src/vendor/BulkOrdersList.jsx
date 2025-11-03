import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyBulkOrders } from "../api/bulkOrders";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react"; // <-- 1. IMPORT QR CODE

const formatCurrency = (amount) =>
  `Ksh ${Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;

const getStatusColor = (status) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-700";
    case "Confirmed":
      return "bg-blue-100 text-blue-700";
    case "In Transit":
      return "bg-cyan-100 text-cyan-700";
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

// 2. ADD A NEW BUTTON STYLE
const getActionButton = (status) => {
  if (status === "In Transit") {
    return "bg-emerald-600 text-white hover:bg-emerald-700";
  }
  return "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50";
};

const BulkOrdersList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  // 3. ADD STATE FOR THE MODAL
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);

  const loadMyBulkOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setApiError(null);
    try {
      const data = await fetchMyBulkOrders();

      const mappedOrders = data.map((order) => {
        const itemsList =
          order.items
            ?.map((i) => `${i.quantity}x ${i.name || "Item"}`)
            .join(", ") || "Items missing";

        let paymentStatus = "Unpaid";
        if (
          order.paymentStatus === "Paid" ||
          order.paymentStatus === "Escrow"
        ) {
          paymentStatus = order.orderStatus === "Delivered" ? "Paid" : "Escrow";
        }

        return {
          ...order,
          id: order._id,
          farmer:
            order.farmerInfo?.farmName || order.farmerInfo?.name || "Farmer",
          items: itemsList,
          amount: formatCurrency(order.totalAmount),
          status: order.orderStatus,
          payment: paymentStatus,
          // 4. STORE THE TASK DATA
          task: order.task,
        };
      });

      setOrders(mappedOrders);
    } catch (err) {
      console.error("Error fetching outgoing bulk orders:", err);
      setApiError("Failed to load your outgoing bulk orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyBulkOrders();
  }, [loadMyBulkOrders]);

  // 5. ADD HANDLER TO SHOW THE QR CODE
  const handleShowConfirmationQR = (order) => {
    if (order.status !== "In Transit" || !order.task) {
      alert("This order is not in transit or the task data is missing.");
      return;
    }

    setQrCodeData({
      orderId: order.id,
      code: order.task.vendorConfirmationCode,
      buyerName: user.name,
    });
    setShowQrModal(true);
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "pending")
      return (
        order.status === "Pending" ||
        order.status === "Confirmed" ||
        order.status === "QR Scanning"
      );
    if (activeTab === "delivery") return order.status === "In Transit";
    if (activeTab === "completed")
      return order.status === "Delivered" || order.status === "Cancelled";
    return true;
  });

  const getTabCount = (tab) => {
    if (tab === "pending")
      return orders.filter(
        (o) =>
          o.status === "Pending" ||
          o.status === "Confirmed" ||
          o.status === "QR Scanning"
      ).length;
    if (tab === "delivery")
      return orders.filter((o) => o.status === "In Transit").length;
    if (tab === "completed")
      return orders.filter(
        (o) => o.status === "Delivered" || o.status === "Cancelled"
      ).length;
    return 0;
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Bulk Orders
        </h1>
        <p className="text-gray-600">Track your bulk purchases from farmers.</p>
        {apiError && (
          <div className="mt-4 text-red-600 bg-red-100 p-3 rounded-lg">
            {apiError}
          </div>
        )}
      </div>

      <div className="flex space-x-8 border-b border-gray-200 mb-6">
        {[
          { id: "pending", label: "Pending" },
          { id: "delivery", label: "In Transit" },
          { id: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 px-1 relative ${
              activeTab === tab.id
                ? "text-emerald-600 font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center space-x-2">
              <span>{tab.label}</span>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {getTabCount(tab.id)}
              </span>
            </div>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-600">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading your bulk supply history...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            No {activeTab} orders found.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Farmer
                </th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
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
                    {order.farmer}
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
                    {/* 6. MODIFY THE BUTTON */}
                    <button
                      onClick={() => handleShowConfirmationQR(order)}
                      disabled={order.status !== "In Transit"}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm ${getActionButton(
                        order.status
                      )} disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                    >
                      {order.status === "In Transit"
                        ? "Confirm Delivery"
                        : "View Details"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 7. ADD THE QR CODE MODAL */}
      {showQrModal && qrCodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md relative">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
              Rider Delivery Confirmation
            </h2>
            <p className="text-gray-600 text-sm mb-6 text-center">
              Ask the rider to scan this code to confirm your delivery.
            </p>
            <div className="flex justify-center mb-6 bg-white p-4 rounded">
              <QRCodeCanvas
                value={JSON.stringify({
                  type: "DELIVERY", // Use a generic "DELIVERY" type
                  code: qrCodeData.code || "NO-CODE",
                  orderId: qrCodeData.orderId,
                })}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-gray-700">
                Order: #{qrCodeData.orderId.substring(18).toUpperCase()}
              </p>
              <p className="text-4xl font-bold text-gray-900 tracking-widest my-2">
                {qrCodeData.code}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setQrCodeData(null);
                  loadMyBulkOrders(); // Refresh orders in case status changed
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkOrdersList;
