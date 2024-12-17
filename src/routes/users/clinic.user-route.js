import express from "express";
import {
  getClinicsByCustomer,
  getDetailClinic,
  getClinicFilterOptions
} from "../../controllers/clinic.controller.js";
import {
  createReviewClinic,
  getAllReviewClinic,
} from "../../controllers/review-clinic.controller.js";
import { authMiddlewareUser } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/by-customer", getClinicsByCustomer);
router.get("/reviews", getAllReviewClinic);
router.post("/reviews", authMiddlewareUser, createReviewClinic);
router.get("/filter-options", getClinicFilterOptions);
router.get("/:slug", getDetailClinic);

export default router;
