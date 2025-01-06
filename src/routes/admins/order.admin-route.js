import express from "express";
import {
  getOrderByAdmin,
  getOrderDetails,
  removeOrder,
  updateOrder,
  updateStatusOrderByAdmin,
} from "../../controllers/order.controller.js";

const router = express.Router();

router.get("/", getOrderByAdmin);
router.get("/:id", getOrderDetails);
router.put("/:id", updateOrder);
router.delete("/:id", removeOrder);
router.put("/status/:id", updateStatusOrderByAdmin);

export default router;
