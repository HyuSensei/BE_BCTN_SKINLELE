import express from "express";
import {
  createPromotion,
  deletePromotion,
  getAllPromotions,
  updatePromotion,
} from "../../controllers/promotion.controller.js";
import { validateMiddleWare } from "../../middleware/validate.middleware.js";
import { createPromotionValidate } from "../../validates/promotion.validate.js";

const router = express.Router();

router.get("/", getAllPromotions);
router.post("/", createPromotionValidate, validateMiddleWare, createPromotion);
router.put("/:id", updatePromotion);
router.delete("/:id", deletePromotion);

export default router;
