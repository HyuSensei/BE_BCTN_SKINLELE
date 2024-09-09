import express from "express";
import {
  getOrderByAdmin,
  removeOrder,
  updateOrder,
} from "../../controllers/order.controller.js";

router.get("/", getOrderByAdmin);
router.put("/:id", updateOrder);
router.delete("/:id", removeOrder);

const router = express.Router();
