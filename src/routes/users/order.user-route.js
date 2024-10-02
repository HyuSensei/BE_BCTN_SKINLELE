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
} from "../../controllers/order.controller.js";

const router = express.Router();

router.post("/cod", authMiddlewareUser, createOrderValidate, createOrderCod);
router.post(
  "/vnpay",
  authMiddlewareUser,
  createOrderValidate,
  createOrderVnpay
);
router.post(
  "/stripe",
  authMiddlewareUser,
  createOrderValidate,
  createOrderStripe
);
router.post("/vnpay-return", authMiddlewareUser, orderVnpayReturn);
router.get("/stripe-return", authMiddlewareUser, orderStripeReturn);
router.put("/:id", authMiddlewareUser, updateOrderByUser);
router.get("/", authMiddlewareUser, getOrderByUser);

export default router;
