import express from "express";
// Make sure these paths are correct for your project
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  placeBulkOrder,
  getMyBulkOrders,
  getFarmerBulkOrders,
  acceptBulkOrder,
  getBulkOrderTask,
  adminGetAllBulkOrders,
} from "../controllers/bulkOrders.controller.js";

const router = express.Router();

// --- Vendor Routes (Buying) ---
router.post(
  "/place",
  requireAuth,
  requireRole(["vendor", "admin"]),
  placeBulkOrder
);
router.get(
  "/my-orders",
  requireAuth,
  requireRole(["vendor", "admin"]),
  getMyBulkOrders
);

// --- Farmer Routes (Selling) ---
router.get(
  "/farmer-orders",
  requireAuth,
  requireRole(["farmer", "admin"]),
  getFarmerBulkOrders
);
router.patch(
  "/:id/accept", // Farmer accepts order
  requireAuth,
  requireRole(["farmer", "admin"]),
  acceptBulkOrder
);
router.get(
  "/:id/task", // Farmer gets task for QR code
  requireAuth,
  requireRole(["farmer", "admin"]),
  getBulkOrderTask
);

// --- Admin Routes ---
router.get(
  "/admin/all",
  requireAuth,
  requireRole(["admin"]),
  adminGetAllBulkOrders
);

export default router;
