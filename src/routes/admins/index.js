import express from "express";
import authRoutes from "./auth.admin-route.js";
import brandRoutes from "./brand.admin-route.js";
import categoryRoutes from "./category.admin-route.js";
import orderRoutes from "./order.admin-route.js";
import productRoutes from "./product.admin-route.js";
import reviewRoutes from "./review.admin-route.js";
import userRoutes from "./user.admin-route.js";
import statisticalRoutes from "./statistical.admin.js";
import promotionRoutes from "./promotion.admin-route.js";
import { authMiddlewareAdmin } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/brands", authMiddlewareAdmin, brandRoutes);
router.use("/categories", authMiddlewareAdmin, categoryRoutes);
router.use("/orders", authMiddlewareAdmin, orderRoutes);
router.use("/products", authMiddlewareAdmin, productRoutes);
router.use("/reviews", authMiddlewareAdmin, reviewRoutes);
router.use("/users", authMiddlewareAdmin, userRoutes);
router.use("/statistical", authMiddlewareAdmin, statisticalRoutes);
router.use("/promotions", authMiddlewareAdmin, promotionRoutes);

export default router;
