import express from "express";
import {
  deleteCategory,
  createCategory,
  getAllCategory,
  updateCategory,
} from "../../controllers/category.controller.js";

router.get("/", getAllCategory);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

const router = express.Router();
