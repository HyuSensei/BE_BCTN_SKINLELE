import express from "express";
import {
  getOrderByAdmin,
  removeOrder,
  updateOrder,
} from "../../controllers/order.controller.js";

const router = express.Router();

router.get("/", getOrderByAdmin);
router.put("/:id", updateOrder);
router.delete("/:id", removeOrder);

export default router;
