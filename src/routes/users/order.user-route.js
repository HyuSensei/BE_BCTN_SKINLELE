import express from "express";
import { authMiddlewareUser } from "../../middleware/auth.middleware.js";
import { createOrderValidate } from "../../validates/order.validate.js";
import {
  getOrderByUser,
  createOrderCod,
  createOrderStripe,
  createOrderVnpay,
  orderStripeReturn,
  orderVnpayReturn,
  updateOrderByUser,
  updateStatusOrderByUser,
  getOrderDetailByUser,
} from "../../controllers/order.controller.js";
import { validateMiddleWare } from "../../middleware/validate.middleware.js";

const router = express.Router();

router.post(
  "/cod",
  authMiddlewareUser,
  createOrderValidate,
  validateMiddleWare,
  createOrderCod
);
router.post(
  "/vnpay",
  authMiddlewareUser,
  createOrderValidate,
  validateMiddleWare,
  createOrderVnpay
);
router.post(
  "/stripe",
  authMiddlewareUser,
  createOrderValidate,
  validateMiddleWare,
  createOrderStripe
);
router.post("/vnpay-return", authMiddlewareUser, orderVnpayReturn);
router.get("/stripe-return", authMiddlewareUser, orderStripeReturn);
router.get("/", authMiddlewareUser, getOrderByUser);
router.get("/detail/:id", authMiddlewareUser, getOrderDetailByUser);
router.put("/:id", authMiddlewareUser, updateOrderByUser);
router.put("/status/:id", authMiddlewareUser, updateStatusOrderByUser);

export default router;
