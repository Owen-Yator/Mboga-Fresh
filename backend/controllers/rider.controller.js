import Order from "../models/order.model.js";
import DeliveryTask from "../models/deliveryTask.model.js";
import Notification from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import BulkOrder from "../models/bulkOrder.model.js";
import BulkDeliveryTask from "../models/bulkDeliveryTask.model.js"; // Import Bulk Task Model

// --- NOTIFICATION HELPER ---
const createDbNotification = async (
  recipientId,
  relatedId,
  message,
  type = "order",
  title = "Order Alert"
) => {
  try {
    const newNotification = new Notification({
      recipient: recipientId,
      type: type,
      title: title,
      message: message,
      relatedId: relatedId,
    });
    await newNotification.save();
  } catch (error) {
    console.error("Failed to create DB notification:", error);
  }
};
// -----------------------------------------------------------------

// --- HELPER: Notifies all Riders of a new task ---
export const notifyAllAvailableRiders = async (taskId, sellerProfile) => {
  try {
    const riders = await User.find({ role: "rider", status: "active" }).select(
      "_id"
    );
    if (riders.length === 0)
      return console.log("No riders found in the User collection.");

    const sellerName =
      sellerProfile?.farmName || sellerProfile?.businessName || "a seller";

    const notifications = riders.map((rider) => ({
      recipient: rider._id,
      type: "task",
      title: "New Delivery Task Available",
      message: `A new delivery from ${sellerName} is available for pickup.`,
      relatedId: taskId,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    console.log(
      `Notified ${notifications.length} riders of new task ${taskId}.`
    );
  } catch (error) {
    console.error("Error notifying riders:", error);
  }
};
// ------------------------------------------------------------------

export const fetchAllAvailableTasks = async (req, res) => {
  try {
    const b2cTasks = await DeliveryTask.find({ status: "Awaiting Acceptance" })
      .populate("vendor", "name businessName")
      .populate("order", "totalAmount")
      .sort({ createdAt: 1 })
      .lean();

    const b2bTasks = await BulkDeliveryTask.find({
      status: "Awaiting Acceptance",
    })
      .populate("seller", "name farmName")
      .populate("bulkOrder", "totalAmount")
      .sort({ createdAt: 1 })
      .lean();

    // Map B2C tasks
    const mappedB2CTasks = b2cTasks
      .map((task) => {
        const orderData = task.order;
        // --- THIS IS THE FIX ---
        // If the task has no order or no seller, filter it out.
        if (!orderData || !task.vendor) return null;
        // --- END OF FIX ---

        return {
          id: task._id,
          orderId: orderData._id,
          totalAmount: orderData.totalAmount,
          vendorName: task.vendor.businessName || task.vendor.name,
          pickupAddress:
            task.deliveryAddress.street + ", " + task.deliveryAddress.city,
          deliveryFee: task.deliveryFee,
          createdAt: task.createdAt,
          type: "B2C",
        };
      })
      .filter(Boolean); // Remove any null tasks

    // Map B2B tasks
    const mappedB2BTasks = b2bTasks
      .map((task) => {
        const orderData = task.bulkOrder;
        // --- THIS IS THE FIX ---
        // If the task has no order or no seller, filter it out.
        if (!orderData || !task.seller) return null;
        // --- END OF FIX ---

        return {
          id: task._id,
          orderId: orderData._id,
          totalAmount: orderData.totalAmount,
          vendorName: task.seller.farmName || task.seller.name,
          pickupAddress:
            task.deliveryAddress.street + ", " + task.deliveryAddress.city,
          deliveryFee: task.deliveryFee,
          createdAt: task.createdAt,
          type: "B2B",
        };
      })
      .filter(Boolean); // Remove any null tasks

    const allTasks = [...mappedB2CTasks, ...mappedB2BTasks].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.json(allTasks);
  } catch (error) {
    console.error("Error fetching available tasks:", error);
    res.status(500).json({ message: "Failed to fetch available tasks." });
  }
};

export const fetchRiderAcceptedTasks = async (req, res) => {
  const riderId = req.user._id;

  try {
    const b2cTasks = await DeliveryTask.find({
      rider: riderId,
      status: { $in: ["Accepted/Awaiting Pickup", "In Transit"] },
    })
      .populate("vendor", "name businessName")
      .populate({
        path: "order",
        select: "shippingAddress totalAmount user",
        populate: { path: "user", select: "name phone" },
      })
      .sort({ createdAt: -1 })
      .lean();

    const b2bTasks = await BulkDeliveryTask.find({
      driver: riderId,
      status: { $in: ["Accepted/Awaiting Pickup", "In Transit"] },
    })
      .populate("seller", "name farmName")
      .populate({
        path: "bulkOrder",
        select: "shippingAddress totalAmount vendorId",
        populate: { path: "vendorId", select: "name phone" },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Map B2C
    const mappedB2CTasks = b2cTasks
      .map((task) => {
        const orderData = task.order;
        // --- THIS IS THE FIX ---
        if (!orderData || !task.vendor) return null;
        // --- END OF FIX ---
        const buyerData = orderData.user;
        return {
          id: task._id,
          orderId: orderData._id,
          totalAmount: orderData.totalAmount,
          vendorName: task.vendor.businessName || task.vendor.name,
          pickupAddress:
            "Pickup from " + (task.vendor.businessName || task.vendor.name),
          deliveryAddress:
            orderData.shippingAddress.street +
            ", " +
            orderData.shippingAddress.city,
          buyerName: buyerData?.name || "Unknown",
          buyerPhone: buyerData?.phone || "N/A",
          deliveryFee: task.deliveryFee,
          createdAt: task.createdAt,
          status: task.status,
          pickupCode: task.pickupCode,
          isAssigned: true,
          buyerConfirmationCode: task.buyerConfirmationCode,
          type: "B2C",
        };
      })
      .filter(Boolean); // Remove nulls

    // Map B2B
    const mappedB2BTasks = b2bTasks
      .map((task) => {
        const orderData = task.bulkOrder;
        // --- THIS IS THE FIX ---
        if (!orderData || !task.seller) return null;
        // --- END OF FIX ---
        const buyerData = orderData.vendorId;
        return {
          id: task._id,
          orderId: orderData._id,
          totalAmount: orderData.totalAmount,
          vendorName: task.seller.farmName || task.seller.name,
          pickupAddress:
            "Pickup from " + (task.seller.farmName || task.seller.name),
          deliveryAddress:
            orderData.shippingAddress.street +
            ", " +
            orderData.shippingAddress.city,
          buyerName: buyerData?.name || "Unknown",
          buyerPhone: buyerData?.phone || "N/A",
          deliveryFee: task.deliveryFee,
          createdAt: task.createdAt,
          status: task.status,
          pickupCode: task.pickupCode,
          isAssigned: true,
          buyerConfirmationCode: task.vendorConfirmationCode,
          type: "B2B",
        };
      })
      .filter(Boolean); // Remove nulls

    const allTasks = [...mappedB2CTasks, ...mappedB2BTasks].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(allTasks);
  } catch (error) {
    console.error("Error fetching accepted tasks:", error);
    res.status(500).json({ message: "Failed to fetch accepted tasks." });
  }
};

export const acceptDeliveryTask = async (req, res) => {
  const { taskId } = req.params;
  const riderId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: "Invalid Task ID format." });
    }

    let task = await DeliveryTask.findOneAndUpdate(
      { _id: taskId, status: "Awaiting Acceptance", rider: null },
      { $set: { rider: riderId, status: "Accepted/Awaiting Pickup" } },
      { new: true }
    );

    let orderId = task?.order;
    let sellerId = task?.vendor; // B2C uses 'vendor' field

    if (!task) {
      task = await BulkDeliveryTask.findOneAndUpdate(
        { _id: taskId, status: "Awaiting Acceptance", driver: null },
        { $set: { driver: riderId, status: "Accepted/Awaiting Pickup" } },
        { new: true }
      );
      orderId = task?.bulkOrder;
      sellerId = task?.seller; // B2B uses 'seller' field
    }

    if (!task) {
      return res
        .status(409)
        .json({ message: "Task already accepted or does not exist." });
    }

    await createDbNotification(
      sellerId,
      orderId,
      `Rider ${req.user.name} has accepted your task and is en route for pickup.`,
      "task",
      "Rider Accepted Task"
    );

    res.json({ message: "Task accepted successfully. Proceed to pickup." });
  } catch (error) {
    console.error("Rider task acceptance error:", error);
    res.status(500).json({ message: "Failed to accept delivery task." });
  }
};

export const confirmPickupByRider = async (req, res) => {
  const { orderId, pickupCode } = req.body;
  const riderId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid Order ID format." });
    }

    let task = await DeliveryTask.findOneAndUpdate(
      {
        order: orderId,
        rider: riderId,
        pickupCode: pickupCode,
        status: "Accepted/Awaiting Pickup",
      },
      { $set: { status: "In Transit" } },
      { new: true }
    );

    if (!task) {
      task = await BulkDeliveryTask.findOneAndUpdate(
        {
          bulkOrder: orderId,
          driver: riderId,
          pickupCode: pickupCode,
          status: "Accepted/Awaiting Pickup",
        },
        { $set: { status: "In Transit" } },
        { new: true }
      );
    }

    if (!task) {
      return res.status(401).json({
        message: "Invalid scan, code, or task is not ready for pickup.",
      });
    }

    if (task.order) {
      await Order.findByIdAndUpdate(task.order, { orderStatus: "In Delivery" });
    } else if (task.bulkOrder) {
      await BulkOrder.findByIdAndUpdate(task.bulkOrder, {
        orderStatus: "In Transit",
      });
    }

    await createDbNotification(
      task.vendor || task.seller, // Use vendor (B2C) or seller (B2B)
      task.order || task.bulkOrder,
      `Order picked up! Status: In Delivery.`,
      "task",
      "Order Picked Up"
    );

    res.json({ message: "Pickup confirmed. Delivery is now in transit." });
  } catch (error) {
    console.error("Rider pickup confirmation error:", error);
    res.status(500).json({ message: "Failed to confirm pickup." });
  }
};

export const confirmDeliveryByRider = async (req, res) => {
  const { orderId, buyerCode } = req.body;
  const riderId = req.user._id;

  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid Order ID format." });
    }

    let task = await DeliveryTask.findOneAndUpdate(
      {
        order: orderId,
        rider: riderId,
        buyerConfirmationCode: buyerCode,
        status: "In Transit",
      },
      { $set: { status: "Delivered" } },
      { new: true }
    );

    if (!task) {
      task = await BulkDeliveryTask.findOneAndUpdate(
        {
          bulkOrder: orderId,
          driver: riderId,
          vendorConfirmationCode: buyerCode,
          status: "In Transit",
        },
        { $set: { status: "Delivered" } },
        { new: true }
      );
    }

    if (!task) {
      return res
        .status(401)
        .json({ message: "Invalid Confirmation Code or task not in transit." });
    }

    if (task.order) {
      await Order.findByIdAndUpdate(task.order, {
        orderStatus: "Delivered",
        paymentStatus: "Paid",
      });
    } else if (task.bulkOrder) {
      await BulkOrder.findByIdAndUpdate(task.bulkOrder, {
        orderStatus: "Delivered",
        paymentStatus: "Paid",
      });
    }

    await createDbNotification(
      task.vendor || task.seller, // Use vendor (B2C) or seller (B2B)
      task.order || task.bulkOrder,
      `Order completed! Escrow funds released for order #${orderId
        .toString()
        .substring(18)
        .toUpperCase()}.`,
      "payment",
      "Order Delivered & Paid"
    );

    res.json({ message: "Delivery confirmed. Escrow funds released." });
  } catch (error) {
    console.error("Rider final delivery confirmation error:", error);
    res.status(500).json({ message: "Failed to confirm final delivery." });
  }
};

export const getRiderEarningsAndHistory = async (req, res) => {
  const riderId = req.user._id;

  try {
    const b2cTasks = await DeliveryTask.find({
      rider: riderId,
      status: "Delivered",
    })
      .select("deliveryFee createdAt")
      .lean();

    const b2bTasks = await BulkDeliveryTask.find({
      driver: riderId,
      status: "Delivered",
    })
      .select("deliveryFee createdAt")
      .lean();

    const allTasks = [...b2cTasks, ...b2bTasks];

    const totalEarnings = allTasks.reduce(
      (sum, task) => sum + (task.deliveryFee || 0),
      0
    );

    allTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      totalEarnings: totalEarnings,
      completedCount: allTasks.length,
      recentDeliveries: allTasks.slice(0, 5).map((task) => ({
        id: task._id,
        orderId: task.order || task.bulkOrder,
        earnings: task.deliveryFee,
        status: "Delivered",
        date: task.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching rider earnings:", error);
    res.status(500).json({ message: "Failed to fetch rider earnings data." });
  }
};

export const getVendorNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(
      notifications.map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        icon: "Package",
        isRead: n.isRead,
        timestamp: n.createdAt,
        relatedId: n.relatedId,
      }))
    );
  } catch (error) {
    console.error("Error fetching vendor notifications:", error);
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
};
