import Order from "../models/order.model.js";
import BulkOrder from "../models/bulkOrder.model.js"; // 1. IMPORT B2B ORDER MODEL
import { User } from "../models/user.model.js";
import DeliveryTask from "../models/deliveryTask.model.js";
import BulkDeliveryTask from "../models/bulkDeliveryTask.model.js";
import mongoose from "mongoose";

// --- HELPER FUNCTION to parse M-Pesa dates ---
const parseMpesaDate = (mpesaDateCode, fallbackDate) => {
  const mpesaDateStr = String(mpesaDateCode || "");
  if (mpesaDateStr.length === 14) {
    const year = mpesaDateStr.substring(0, 4);
    const month = mpesaDateStr.substring(4, 6);
    const day = mpesaDateStr.substring(6, 8);
    const hour = mpesaDateStr.substring(8, 10);
    const minute = mpesaDateStr.substring(10, 12);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
  }
  return new Date(fallbackDate); // Fallback to the order creation date
};

// --- MODIFIED FUNCTION ---
const getTotalEscrowBalance = async (req, res) => {
  try {
    // 1. Get B2C (Retail) Escrow
    const b2cOrdersPromise = Order.find({
      paymentStatus: "Paid", // In B2C, "Paid" is Escrow until delivered
      orderStatus: { $nin: ["Delivered", "Cancelled"] },
    }).select("totalAmount");

    // 2. Get B2B (Bulk) Escrow
    const b2bOrdersPromise = BulkOrder.find({
      paymentStatus: "Escrow", // In B2B, "Escrow" is the explicit status
      orderStatus: { $nin: ["Delivered", "Cancelled"] },
    }).select("totalAmount");

    const [b2cOrders, b2bOrders] = await Promise.all([
      b2cOrdersPromise,
      b2bOrdersPromise,
    ]);

    const b2cEscrow = b2cOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const b2bEscrow = b2bOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    res.json({ totalEscrow: b2cEscrow + b2bEscrow });
  } catch (error) {
    console.error("Error fetching total escrow balance:", error);
    res.status(500).json({ message: "Failed to calculate escrow balance." });
  }
};

// --- MODIFIED FUNCTION ---
const listAllOrders = async (req, res) => {
  try {
    // 1. Fetch B2C (Retail) Orders
    const b2cOrdersPromise = Order.find({})
      .populate("user", "name phone") // B2C Buyer
      .populate("items.vendor", "name businessName") // B2C Seller
      .sort({ createdAt: -1 })
      .select("-__v -updatedAt")
      .lean();

    // 2. Fetch B2B (Bulk) Orders
    const b2bOrdersPromise = BulkOrder.find({})
      .populate("vendorId", "name phone") // B2B Buyer
      .populate("farmerId", "name farmName") // B2B Seller
      .sort({ createdAt: -1 })
      .select("-__v -updatedAt")
      .lean();

    const [b2cOrders, b2bOrders] = await Promise.all([
      b2cOrdersPromise,
      b2bOrdersPromise,
    ]);

    // 3. Map B2C orders to a standard format
    const mappedB2COrders = b2cOrders
      .map((order) => {
        // Safety check for old/bad data
        if (!Array.isArray(order.items) || order.items.length === 0) {
          return null;
        }
        return {
          ...order,
          orderType: "B2C (Retail)",
          buyer: order.user,
          seller: order.items[0].vendor,
        };
      })
      .filter(Boolean); // Remove any null orders

    // 4. Map B2B orders to a standard format
    const mappedB2BOrders = b2bOrders.map((order) => ({
      ...order,
      orderType: "B2B (Bulk)",
      buyer: order.vendorId,
      seller: order.farmerId,
    }));

    // 5. Merge and re-sort
    const allOrders = [...mappedB2COrders, ...mappedB2BOrders].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(allOrders);
  } catch (error) {
    console.error("Error fetching all orders for admin:", error);
    res.status(500).json({ message: "Failed to fetch all orders." });
  }
};

// --- MODIFIED FUNCTION ---
const listAllTransactions = async (req, res) => {
  try {
    // 1. Get B2C (Retail) Transactions
    const b2cPromise = Order.find({ paymentStatus: "Paid" })
      .populate("user", "name phone")
      .sort({ createdAt: -1 })
      .select(
        "user totalAmount orderStatus mpesaReceiptNumber mpesaTransactionDate mpesaPhoneNumber createdAt"
      )
      .lean();

    // 2. Get B2B (Bulk) Transactions
    const b2bPromise = BulkOrder.find({
      paymentStatus: { $in: ["Paid", "Escrow"] }, // Get all successful payments
    })
      .populate("vendorId", "name phone") // B2B Buyer is the vendor
      .sort({ createdAt: -1 })
      .select("vendorId totalAmount orderStatus paymentDetails createdAt")
      .lean();

    const [b2cOrders, b2bOrders] = await Promise.all([b2cPromise, b2bPromise]);

    // 3. Map B2C Transactions
    const b2cTransactions = b2cOrders.map((order) => {
      const transactionDate = parseMpesaDate(
        order.mpesaTransactionDate,
        order.createdAt
      );

      return {
        id: order._id,
        orderType: "B2C (Retail)",
        buyerName: order.user?.name || "N/A",
        amount: Number(order.totalAmount) || 0,
        transactionDate: transactionDate.toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        transactionTime: transactionDate.toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        mpesaCode: order.mpesaReceiptNumber || "N/A",
        phone: order.mpesaPhoneNumber || order.user?.phone || "N/A",
        status: order.orderStatus,
        rawDate: transactionDate,
      };
    });

    // 4. Map B2B Transactions
    const b2bTransactions = b2bOrders.map((order) => {
      const transactionDate = parseMpesaDate(
        order.paymentDetails?.mpesaTransactionDate,
        order.createdAt
      );

      return {
        id: order._id,
        orderType: "B2B (Bulk)",
        buyerName: order.vendorId?.name || "N/A", // The vendor is the buyer
        amount: Number(order.totalAmount) || 0,
        transactionDate: transactionDate.toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        transactionTime: transactionDate.toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        mpesaCode: order.paymentDetails?.mpesaReceiptNumber || "N/A",
        phone:
          order.paymentDetails?.mpesaPhoneNumber ||
          order.vendorId?.phone ||
          "N/A",
        status: order.orderStatus,
        rawDate: transactionDate,
      };
    });

    // 5. Merge and sort all transactions
    const allTransactions = [...b2cTransactions, ...b2bTransactions].sort(
      (a, b) => b.rawDate - a.rawDate
    );

    res.json(allTransactions);
  } catch (error) {
    console.error(
      "Error fetching all transactions for admin: CRASH DETECTED",
      error
    );
    res.status(500).json({
      message:
        "Internal Server Error during transaction processing. See server logs.",
      details: error.message,
    });
  }
};

// --- NEW FUNCTION TO GET ALL ANALYTICS ---
const getAnalyticsSummary = async (req, res) => {
  try {
    const { period = "monthly" } = req.query; // daily, weekly, monthly

    // --- 1. Get Platform Totals ---
    const [totalUsers, totalVendors, totalFarmers] = await Promise.all([
      User.countDocuments({ role: "buyer" }),
      User.countDocuments({ role: "vendor" }),
      User.countDocuments({ role: "farmer" }),
    ]);

    // --- 2. Get Revenue Data ---
    const b2cPaidOrders = await Order.find({
      paymentStatus: "Paid",
    }).select("totalAmount createdAt");

    const b2bPaidOrders = await BulkOrder.find({
      paymentStatus: { $in: ["Paid", "Escrow"] },
    }).select("totalAmount createdAt");

    const allOrders = [
      ...b2cPaidOrders.map((o) => ({ ...o.toObject(), type: "B2C" })),
      ...b2bPaidOrders.map((o) => ({ ...o.toObject(), type: "B2B" })),
    ];

    let totalRevenue = 0;
    let b2cRevenue = 0;
    let b2bRevenue = 0;
    const revenueChartData = {};

    // Set time boundaries
    const now = new Date();
    let daysToScan = 30; // Default: 30 days for 'monthly'
    if (period === "weekly") daysToScan = 7;
    if (period === "daily") daysToScan = 7; // Use 7 days for "daily" to show a trend

    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (daysToScan - 1)
    );
    startDate.setHours(0, 0, 0, 0);

    // Initialize chart data with 0s
    for (let i = 0; i < daysToScan; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const key = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
      revenueChartData[key] = {
        name: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        revenue: 0,
      };
    }

    // Aggregate revenue
    allOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);

      // Only include orders within the selected time period
      if (orderDate >= startDate) {
        totalRevenue += order.totalAmount;

        if (order.type === "B2C") {
          b2cRevenue += order.totalAmount;
        } else {
          b2bRevenue += order.totalAmount;
        }

        const key = orderDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
        if (revenueChartData[key]) {
          revenueChartData[key].revenue += order.totalAmount;
        }
      }
    });

    res.json({
      platformTotals: {
        totalUsers,
        totalVendors,
        totalFarmers,
      },
      revenueReport: {
        totalRevenue,
        b2cRevenue,
        b2bRevenue,
        period,
        revenueChartData: Object.values(revenueChartData),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    res.status(500).json({ message: "Failed to fetch analytics." });
  }
};

// --- NEW FUNCTION TO GET DELIVERY CHART DATA ---
const getDeliveryChartData = async (req, res) => {
  try {
    const days = 7; // Get data for the last 7 days
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days + 1);
    dateLimit.setHours(0, 0, 0, 0);

    const b2cTasks = await DeliveryTask.find({
      status: "Delivered",
      createdAt: { $gte: dateLimit },
    }).select("createdAt");

    const b2bTasks = await BulkDeliveryTask.find({
      status: "Delivered",
      createdAt: { $gte: dateLimit },
    }).select("createdAt");

    const allTasks = [...b2cTasks, ...b2bTasks];

    const chartData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(dateLimit);
      date.setDate(date.getDate() + i);
      const key = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
      chartData[key] = {
        name: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        deliveries: 0,
      };
    }

    allTasks.forEach((task) => {
      const key = new Date(task.createdAt).toLocaleDateString("en-CA");
      if (chartData[key]) {
        chartData[key].deliveries += 1;
      }
    });

    res.json(Object.values(chartData));
  } catch (error) {
    console.error("Error fetching delivery chart data:", error);
    res.status(500).json({ message: "Failed to fetch delivery data." });
  }
};

// --- FINAL EXPORTS ---
export {
  getTotalEscrowBalance,
  listAllOrders,
  listAllTransactions,
  getAnalyticsSummary,
  getDeliveryChartData,
};
