import express from "express";
import {
  getReviewByAdmin,
  removeReview,
  updateReview,
} from "../../controllers/review.controller.js";

const router = express.Router();

router.get("/reviews", getReviewByAdmin);
router.put("/reviews/:id", updateReview);
router.delete("/reviews/:id", removeReview);

export default router;
