import express from "express";
import authRoutes from "./auth.admin-route.js";
import brandRoutes from "./brand.admin-route.js";
import categoryRoutes from "./category.admin-route.js";
import orderRoutes from "./order.admin-route.js";
import productRoutes from "./product.admin-route.js";
import reviewRoutes from "./review.admin-route.js";
import userRoutes from "./user.admin-route.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/brands", brandRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);
router.use("/users", userRoutes);

export default router;
