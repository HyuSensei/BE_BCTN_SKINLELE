import express from "express";
import {
  getDoctorDetail,
  updateDoctor,
} from "../../controllers/doctor.controller.js";
import {
  createReviewDoctor,
  getAllReviewByDoctor,
  removeReviewDoctor,
} from "../../controllers/review-doctor.controller.js";
import {
  authMiddlewareDoctor,
  authMiddlewareUser,
} from "../../middleware/auth.middleware.js";
import { getStatisticalDoctor } from "../../controllers/statistical.controller.js";

const router = express.Router();

router.get("/statistical", authMiddlewareDoctor, getStatisticalDoctor);
router.get("/:slug", getDoctorDetail);
router.put("/", authMiddlewareDoctor, updateDoctor);

router.get("/review/:doctor", getAllReviewByDoctor);
router.post("/review", authMiddlewareUser, createReviewDoctor);
router.delete("/review/:id", authMiddlewareDoctor, removeReviewDoctor);


export default router;
