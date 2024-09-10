import express from "express";
import {
  updateBrand,
  createBrand,
  getAllBrand,
  deleteBrand,
} from "../../controllers/brand.controller.js";

const router = express.Router();

router.get("/", getAllBrand);
router.post("/", createBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;
