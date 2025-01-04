import express from "express";
import {
  getOrderStatistics,
  getOverviewStatistics,
  getRevenueAndOrderStats,
  getReviewStatistics,
  getStatistics,
} from "../../controllers/statistical.controller.js";

const router = express.Router();

router.get("/", getStatistics);
router.get("/overview", getOverviewStatistics);
router.get("/revenue-order", getRevenueAndOrderStats);
router.get("/order-detail", getOrderStatistics);
router.get("/review-detail", getReviewStatistics);

export default router;
