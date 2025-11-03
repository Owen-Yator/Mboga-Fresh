import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { getFarmerDashboardMetrics } from "../controllers/farmer.controller.js";

const router = express.Router();

// @route   GET /api/farmer/dashboard-metrics
// @desc    Get stats for the farmer dashboard
// @access  Private (Farmer)
router.get(
  "/dashboard-metrics",
  requireAuth,
  requireRole(["farmer", "admin"]),
  getFarmerDashboardMetrics
);

// You can add other farmer-specific routes here later

export default router;
