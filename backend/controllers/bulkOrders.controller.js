import BulkOrder from "../models/bulkOrder.model.js";
import BulkProduct from "../models/bulkProduct.model.js";
import FarmerProfile from "../models/farmerProfile.model.js";
// MODIFIED: Import the new, separate task model
import BulkDeliveryTask from "../models/bulkDeliveryTask.model.js";
import fs from "fs";
import path from "path";
import Joi from "joi";

const removeFile = (filePath) => {
  if (!filePath) return;
  const full = path.join(process.cwd(), filePath.replace(/^\//, ""));
  fs.unlink(full, (err) => {});
};

function escapeRegex(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const generateRandomCode = (length = 6) => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
};

// ... (schemas and file upload helper are unchanged) ...
const createSchema = Joi.object({
  name: Joi.string().min(2).required(),
  category: Joi.string().required(),
  price: Joi.number().min(0).required(),
  priceLabel: Joi.string().allow("").optional(),
  quantity: Joi.string().allow("").optional(),
  status: Joi.string().valid("In Stock", "Out of Stock").optional(),
  description: Joi.string().allow("").optional(),
  vendorAssignedId: Joi.string().allow("").optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  category: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  priceLabel: Joi.string().allow("").optional(),
  quantity: Joi.string().allow("").optional(),
  status: Joi.string().valid("In Stock", "Out of Stock").optional(),
  description: Joi.string().allow("").optional(),
  vendorAssignedId: Joi.string().allow("").optional(),
});

function firstUploadedFile(req) {
  if (req.file) return req.file;
  if (Array.isArray(req.files) && req.files.length > 0) return req.files[0];
  return null;
}

// ... (list, getOne, createOne, updateOne, removeOne, placeBulkOrder, getMyBulkOrders are unchanged) ...
export const list = async (req, res) => {
  try {
    const {
      ownerId,
      q,
      limit = 12,
      page = 1,
      category,
      sortBy,
      status = "In Stock",
    } = req.query;

    const limitNum = Number(limit);
    const pageNum = Number(page);
    const skipNum = (pageNum - 1) * limitNum;

    const filter = {};
    if (ownerId) filter.ownerId = ownerId;
    if (status) filter.status = status;

    if (q) {
      const re = new RegExp(String(q), "i");
      filter.$or = [{ name: re }, { category: re }];
    }

    if (category && category !== "all") {
      filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
    }

    let sort = { createdAt: -1 };
    if (sortBy === "price-asc") {
      sort = { price: 1 };
    } else if (sortBy === "price-desc") {
      sort = { price: -1 };
    }

    let products;
    let totalProducts = 0;

    try {
      [totalProducts, products] = await Promise.all([
        BulkProduct.countDocuments(filter),
        BulkProduct.find(filter)
          .sort(sort)
          .skip(skipNum)
          .limit(limitNum)
          .populate("ownerId", "name avatar")
          .lean(),
      ]);
    } catch (dbErr) {
      console.error("DB query failed in bulkProducts.list:", dbErr);
      return res.status(500).json({ message: "Failed to fetch bulk products" });
    }

    const totalPages = Math.ceil(totalProducts / limitNum) || 1;

    const farmerProfiles = await FarmerProfile.find({
      user: { $in: products.map((p) => p.ownerId._id) },
    })
      .select("user farmName")
      .lean();

    const profileMap = new Map(
      farmerProfiles.map((p) => [String(p.user), p.farmName])
    );

    const enrichedProducts = products.map((product) => {
      const ownerName = product.ownerId?.name || "Unknown";
      const farmName = profileMap.get(String(product.ownerId._id));

      return {
        ...product,
        ownerName: farmName || ownerName,
      };
    });

    res.json({
      products: enrichedProducts,
      totalPages,
      currentPage: pageNum,
      totalProducts,
    });
  } catch (err) {
    console.error("bulk list error:", err);
    res.status(500).json({ message: "Failed to fetch bulk products" });
  }
};

export const getOne = async (req, res) => {
  try {
    const p = await BulkProduct.findById(req.params.id)
      .populate("ownerId", "name")
      .lean();
    if (!p) return res.status(404).json({ message: "Bulk product not found" });

    let farmName = p.ownerId?.name || "Unknown";
    const profile = await FarmerProfile.findOne({ user: p.ownerId._id })
      .select("farmName")
      .lean();
    if (profile) farmName = profile.farmName;

    const payload = {
      ...p,
      ownerName: farmName,
    };
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bulk product" });
  }
};

export const createOne = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ message: "Authentication required" });

    const payload = {
      name: req.body.name,
      category: req.body.category,
      price: Number(req.body.price || 0),
      priceLabel: req.body.priceLabel || `KSh ${Number(req.body.price || 0)}`,
      quantity: req.body.quantity || req.body.stock || "",
      status: req.body.status || "In Stock",
      description: req.body.description || "",
      vendorAssignedId: req.body.vendorAssignedId || "",
    };

    const { error } = createSchema.validate(payload);
    if (error) return res.status(400).json({ message: error.message });

    const uploaded = firstUploadedFile(req);
    if (uploaded) {
      payload.imagePath = `/uploads/${uploaded.filename}`;
    }

    payload.ownerId = req.user._id;
    payload.ownerRole = req.user.role || "farmer";

    const created = await BulkProduct.create(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error("create bulk error:", err);
    res.status(500).json({ message: "Failed to create bulk product" });
  }
};

export const updateOne = async (req, res) => {
  try {
    const product = await BulkProduct.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Bulk product not found" });

    if (!req.user)
      return res.status(401).json({ message: "Authentication required" });
    const isOwner = String(product.ownerId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden — not owner" });
    }

    const payload = {
      name: req.body.name,
      category: req.body.category,
      price:
        typeof req.body.price !== "undefined"
          ? Number(req.body.price)
          : undefined,
      priceLabel: req.body.priceLabel,
      quantity: req.body.quantity || req.body.stock,
      status: req.body.status,
      description: req.body.description,
      vendorAssignedId: req.body.vendorAssignedId,
    };

    const { error } = updateSchema.validate(payload);
    if (error) return res.status(400).json({ message: error.message });

    const uploaded = firstUploadedFile(req);
    if (uploaded) {
      if (product.imagePath) removeFile(product.imagePath);
      product.imagePath = `/uploads/${uploaded.filename}`;
    }

    for (const key of Object.keys(payload)) {
      if (typeof payload[key] !== "undefined") product[key] = payload[key];
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.error("update bulk error:", err);
    res.status(500).json({ message: "Failed to update bulk product" });
  }
};

export const removeOne = async (req, res) => {
  try {
    const product = await BulkProduct.findById(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Bulk product not found" });

    if (!req.user)
      return res.status(401).json({ message: "Authentication required" });
    const isOwner = String(product.ownerId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Forbidden — not owner" });
    }

    if (product.imagePath) removeFile(product.imagePath);
    await product.deleteOne();
    res.json({ message: "Bulk product deleted" });
  } catch (err) {
    console.error("delete bulk error:", err);
    res.status(500).json({ message: "Failed to delete bulk product" });
  }
};

export const placeBulkOrder = async (req, res) => {
  try {
    const vendorUserId = req.user._id;
    const { items, shippingAddress, mpesaPhone, totalAmount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in cart" });
    }

    const firstProduct = await BulkProduct.findById(items[0].product).lean();
    if (!firstProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    const farmerId = firstProduct.ownerId;

    const newOrder = new BulkOrder({
      vendorId: vendorUserId,
      farmerId: farmerId,
      items: items,
      totalAmount: totalAmount,
      shippingAddress,
      paymentStatus: "Escrow",
      orderStatus: "Pending",
      paymentDetails: {
        mpesaPhone,
      },
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      message: "Order placed successfully",
      orderId: savedOrder._id,
    });
  } catch (err) {
    console.error("Place Bulk Order Error:", err);
    res.status(500).json({ message: "Server error placing order" });
  }
};

export const getMyBulkOrders = async (req, res) => {
  try {
    const vendorUserId = req.user._id;

    const orders = await BulkOrder.find({ vendorId: vendorUserId })
      .populate({
        path: "items.product",
        select: "name",
      })
      .populate({
        path: "farmerId",
        select: "name avatar",
      })
      .sort({ createdAt: -1 })
      .lean();

    const farmerIds = orders.map((o) => o.farmerId?._id).filter(Boolean);
    const profiles = await FarmerProfile.find({ user: { $in: farmerIds } })
      .select("user farmName")
      .lean();
    const profileMap = new Map(
      profiles.map((p) => [String(p.user), p.farmName])
    );

    const enrichedOrders = orders.map((order) => ({
      ...order,
      farmerInfo: {
        ...order.farmerId,
        farmName: profileMap.get(String(order.farmerId?._id)),
      },
    }));

    res.json(enrichedOrders);
  } catch (err) {
    console.error("Error fetching vendor's bulk orders:", err);
    res.status(500).json({ message: "Failed to fetch bulk orders" });
  }
};

export const getFarmerBulkOrders = async (req, res) => {
  try {
    const farmerUserId = req.user._id;
    const orders = await BulkOrder.find({ farmerId: farmerUserId })
      .populate("vendorId", "name phone")
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (err) {
    console.error("Error fetching farmer's bulk orders:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// --- THIS IS THE MODIFIED FUNCTION ---
export const acceptBulkOrder = async (req, res) => {
  try {
    const order = await BulkOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.farmerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (order.orderStatus !== "Pending") {
      return res.status(400).json({ message: "Order already processed" });
    }

    // 1. Create a new BULK DeliveryTask
    const newTask = new BulkDeliveryTask({
      bulkOrder: order._id,
      seller: order.farmerId, // The farmer is the seller
      pickupCode: generateRandomCode(6),
      vendorConfirmationCode: generateRandomCode(6), // Use the new field name
      deliveryAddress: order.shippingAddress,
      status: "Awaiting Acceptance",
    });

    await newTask.save(); // This will no longer have a duplicate key error

    // 2. Update the order
    order.orderStatus = "QR Scanning";
    order.task = newTask._id;
    await order.save();

    res.json({
      message: "Order accepted. Task created.",
      order,
      task: newTask,
    });
  } catch (err) {
    console.error("Error accepting bulk order:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    // Check for duplicate key error on 'bulkOrder' (which is good, means we didn't double-accept)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.bulkOrder) {
      return res
        .status(400)
        .json({ message: "A task for this bulk order already exists." });
    }
    res.status(500).json({ message: "Server error" });
  }
};

export const getBulkOrderTask = async (req, res) => {
  try {
    const order = await BulkOrder.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isFarmer = order.farmerId.toString() === req.user._id.toString();
    if (!isFarmer && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!order.task) {
      return res
        .status(404)
        .json({ message: "Task not yet created for this order" });
    }

    // MODIFIED: Find from the correct task collection
    const task = await BulkDeliveryTask.findById(order.task).lean();
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (err) {
    console.error("Error fetching bulk order task:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const adminGetAllBulkOrders = async (req, res) => {
  try {
    const orders = await BulkOrder.find({})
      .populate("vendorId", "name email")
      .populate("farmerId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(orders);
  } catch (err) {
    console.error("Error fetching all bulk orders:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};
