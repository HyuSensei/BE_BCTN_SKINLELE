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
import doctorRoutes from "./doctor.admin-route.js";
import { authMiddlewareAdmin } from "../../middleware/auth.middleware.js";

const router = express.Router();
const adminStores = ["ADMIN", "SUPPORT"];
const adminDoctors = ["DOCTOR"];

router.use("/auth", authRoutes);
router.use("/brands", authMiddlewareAdmin(adminStores), brandRoutes);
router.use("/categories", authMiddlewareAdmin(adminStores), categoryRoutes);
router.use("/orders", authMiddlewareAdmin(adminStores), orderRoutes);
router.use("/products", authMiddlewareAdmin(adminStores), productRoutes);
router.use("/reviews", authMiddlewareAdmin(adminStores), reviewRoutes);
router.use("/users", authMiddlewareAdmin(adminStores), userRoutes);
router.use("/statistical", authMiddlewareAdmin(adminStores), statisticalRoutes);
router.use("/promotions", authMiddlewareAdmin(adminStores), promotionRoutes);
router.use("/doctors", authMiddlewareAdmin(adminDoctors), doctorRoutes);

export default router;
