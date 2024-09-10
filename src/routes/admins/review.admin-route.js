import express from "express";
import {
  getReviewByAdmin,
  removeReview,
  updateReview,
} from "../../controllers/review.controller.js";

const router = express.Router();

router.get("/review", getReviewByAdmin);
router.put("/review/:id", updateReview);
router.delete("/review/:id", removeReview);

export default router;
