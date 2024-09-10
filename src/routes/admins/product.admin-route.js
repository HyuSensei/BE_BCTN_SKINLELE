import express from "express";
import {
  removeProduct,
  createProduct,
  getAllProduct,
  updateProduct,
} from "../../controllers/product.controller.js";

const router = express.Router();

router.get("/", getAllProduct);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", removeProduct);

export default router;
