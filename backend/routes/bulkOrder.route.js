import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  placeBulkOrder,
  getMyBulkOrders,
  getFarmerBulkOrders,
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

export default router;
