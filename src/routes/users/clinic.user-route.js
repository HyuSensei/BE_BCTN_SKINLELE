import express from "express";
import { getDetailClinic } from "../../controllers/clinic.controller.js";
import { createReviewClinic } from "../../controllers/review-clinic.controller.js";
import { authMiddlewareUser } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:id", getDetailClinic);
router.post("/reviews", authMiddlewareUser, createReviewClinic);

export default router;
