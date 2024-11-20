import express from "express";
import {
  authMiddlewareDoctor,
  authMiddlewareUser,
} from "../../middleware/auth.middleware.js";
import {
  createReviewDoctor,
  getAllReviewByDoctor,
  removeReviewDoctor,
} from "../../controllers/review-doctor.controller.js";

const router = express.Router();

router.get("/:doctor", getAllReviewByDoctor);
router.post("/", authMiddlewareUser, createReviewDoctor);
router.delete("/", authMiddlewareDoctor, removeReviewDoctor);

export default router;
