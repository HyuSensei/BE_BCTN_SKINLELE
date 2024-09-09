import express from "express";
import {
  updateBrand,
  createBrand,
  getAllBrand,
  deleteBrand,
} from "../../controllers/brand.controller.js";

router.get("/", getAllBrand);
router.post("/", createBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

const router = express.Router();
