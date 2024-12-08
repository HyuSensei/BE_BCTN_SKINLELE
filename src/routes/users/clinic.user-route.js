import express from "express";
import {
  getClinicsByCustomer,
  getDetailClinic,
} from "../../controllers/clinic.controller.js";
import {
  createReviewClinic,
  getAllReviewClinic,
} from "../../controllers/review-clinic.controller.js";
import { authMiddlewareUser } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/by-customer", getClinicsByCustomer);
router.get("/reviews/:clinic", getAllReviewClinic);
router.get("/:slug", getDetailClinic);
router.post("/reviews", authMiddlewareUser, createReviewClinic);

export default router;
