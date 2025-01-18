import express from "express";
import {
  deleteCategory,
  createCategory,
  getAllCategory,
  updateCategory,
  getAllFilter,
  getAllByAdmin,
} from "../../controllers/category.controller.js";

const router = express.Router();

router.get("/all", getAllByAdmin);
router.get("/", getAllCategory);
router.get("/filter", getAllFilter);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
