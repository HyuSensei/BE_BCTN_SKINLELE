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
  updateOrder,
} from "../../controllers/order.controller";

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
router.put("/status/:id", authMiddlewareUser, updateOrder);
router.get("/", authMiddlewareUser, getOrderByUser);

const router = express.Router();
