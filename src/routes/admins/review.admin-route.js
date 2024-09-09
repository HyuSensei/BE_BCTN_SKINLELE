import express from "express";
import {
  getReviewByAdmin,
  removeReview,
} from "../../controllers/review.controller.js";

router.get("/review", getReviewByAdmin);
router.put("/review/:id", updateReview);
router.delete("/review/:id", removeReview);

const router = express.Router();
