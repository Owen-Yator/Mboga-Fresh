import BulkOrder from "../models/bulkOrder.model.js";

// @desc    Get dashboard metrics for the logged-in farmer
// @route   GET /api/farmer/dashboard-metrics
// @access  Private (Farmer)
export const getFarmerDashboardMetrics = async (req, res) => {
  try {
    const farmerId = req.user._id;

    const allOrders = await BulkOrder.find({ farmerId: farmerId }).lean();

    let ordersReceived = 0;
    let pendingAcceptance = 0;
    let pendingDeliveries = 0;
    let salesInEscrow = 0;
    let earningsReleased = 0;

    allOrders.forEach((order) => {
      ordersReceived++;
      const amount = order.totalAmount;

      if (order.orderStatus === "Delivered") {
        earningsReleased += amount;
      } else if (order.orderStatus === "Pending") {
        pendingAcceptance++;
        if (order.paymentStatus === "Escrow") {
          salesInEscrow += amount;
        }
      } else if (
        order.orderStatus === "QR Scanning" ||
        order.orderStatus === "In Transit"
      ) {
        pendingDeliveries++;
        if (order.paymentStatus === "Escrow") {
          salesInEscrow += amount;
        }
      }
      // 'Cancelled' orders are just counted in 'ordersReceived' but not in other metrics
    });

    res.json({
      ordersReceived,
      pendingAcceptance,
      pendingDeliveries,
      salesInEscrow,
      earningsReleased,
      // You can add more, e.g., total products, etc.
    });
  } catch (err) {
    console.error("Error fetching farmer dashboard metrics:", err);
    res.status(500).json({ message: "Server error" });
  }
};
