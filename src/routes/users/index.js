import express from "express";
import authRoutes from "./auth.user-route.js";
import brandRoutes from "./brand.user-route.js";
import categoryRoutes from "./category.user-route.js";
import orderRoutes from "./order.user-route.js";
import productRoutes from "./product.user-route.js";
import reviewRoutes from "./review.user-route.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/brands", brandRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);

export default router;
