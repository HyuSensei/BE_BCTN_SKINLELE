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
import adminAccountRoutes from "./admin-account.admin-route.js";
import clinicRoutes from "./clinic.admin-route.js";
import { authMiddlewareAdmin } from "../../middleware/auth.middleware.js";
import {
  accessRole,
  ADMIN_ROLE,
  CLINIC_ROLE,
  SUPPORT_ROLE,
} from "../../ultis/getRole.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use(
  "/brands",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  brandRoutes
);
router.use(
  "/categories",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  categoryRoutes
);
router.use(
  "/orders",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  orderRoutes
);
router.use(
  "/products",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  productRoutes
);
router.use(
  "/reviews",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  reviewRoutes
);
router.use(
  "/users",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  userRoutes
);
router.use(
  "/statistical",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  statisticalRoutes
);
router.use(
  "/promotions",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  promotionRoutes
);
router.use(
  "/admin-accounts",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  adminAccountRoutes
);
router.use(
  "/clinics",
  authMiddlewareAdmin(accessRole([ADMIN_ROLE, SUPPORT_ROLE])),
  clinicRoutes
);
router.use(
  "/doctors",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE, ADMIN_ROLE])),
  doctorRoutes
);

export default router;
