import express from "express";
import { authMiddlewareUser } from "../../middleware/auth.middleware.js";
import { createReviewValidate } from "../../validates/review.validate.js";
import { validateMiddleWare } from "../../middleware/validate.middleware.js";
import {
  createReview,
  getReviewByProduct,
} from "../../controllers/review.controller.js";

const router = express.Router();

router.post(
  "/",
  authMiddlewareUser,
  createReviewValidate,
  validateMiddleWare,
  createReview
);
router.get("/:productId", getReviewByProduct);

export default router;
