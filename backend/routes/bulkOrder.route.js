import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import {
  placeBulkOrder,
  getMyBulkOrders,
  getFarmerBulkOrders,
  acceptBulkOrder,
  getBulkOrderTask,
  adminGetAllBulkOrders,
  checkBulkPaymentStatus, // <-- 1. IMPORT NEW FUNCTION
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
// 2. ADD NEW POLLING ROUTE
router.get(
  "/payment-status/:orderId",
  requireAuth,
  requireRole(["vendor", "admin"]),
  checkBulkPaymentStatus
);

// --- Farmer Routes (Selling) ---
router.get(
  "/farmer-orders",
  requireAuth,
  requireRole(["farmer", "admin"]),
  getFarmerBulkOrders
);
router.patch(
  "/:id/accept",
  requireAuth,
  requireRole(["farmer", "admin"]),
  acceptBulkOrder
);
router.get(
  "/:id/task",
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
