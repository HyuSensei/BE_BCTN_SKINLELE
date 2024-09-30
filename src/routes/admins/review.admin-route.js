import express from "express";
import {
  getReviewByAdmin,
  removeReview,
  updateReview,
} from "../../controllers/review.controller.js";

const router = express.Router();

router.get("/", getReviewByAdmin);
router.put("/:id", updateReview);
router.delete("/:id", removeReview);

export default router;
