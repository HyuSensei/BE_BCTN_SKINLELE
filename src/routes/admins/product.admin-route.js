import express from "express";
import {
  removeProduct,
  createProduct,
  getAllProduct,
  updateProduct,
  getProductByPromotionAdd,
} from "../../controllers/product.controller.js";

const router = express.Router();

router.get("/", getAllProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", removeProduct);
router.get("/promotion-create", getProductByPromotionAdd);

export default router;
