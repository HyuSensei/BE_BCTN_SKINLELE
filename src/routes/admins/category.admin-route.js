import express from "express";
import {
  deleteCategory,
  createCategory,
  getAllCategory,
  updateCategory,
  getAllFilter,
} from "../../controllers/category.controller.js";
import { validateMiddleWare } from "../../middleware/validate.middleware.js";

const router = express.Router();

router.get("/", getAllCategory);
router.get("/filter", getAllFilter);
router.post("/", validateMiddleWare, createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
