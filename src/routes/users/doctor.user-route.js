import express from "express";
import {
  getDoctorDetail,
  getDoctorsByCustomer,
  getDoctorFilterOptions,
  getScheduleByDoctor,
  updateDoctor,
  getDoctorOrClinicSearch,
  getDoctorRecommend,
} from "../../controllers/doctor.controller.js";
import {
  createReviewDoctor,
  getAllReviewByCustomer,
  getAllReviewByDoctor,
  removeReviewDoctor,
  updateReviewDoctor,
} from "../../controllers/review-doctor.controller.js";
import {
  authMiddlewareDoctor,
  authMiddlewareUser,
} from "../../middleware/auth.middleware.js";
import { getStatisticalDoctor } from "../../controllers/statistical.controller.js";
import {
  createSchedule,
  getScheduleBooking,
  removeSchedule,
  updateSchedule,
} from "../../controllers/schedule.controller.js";

const router = express.Router();

router.get("/statistical", authMiddlewareDoctor, getStatisticalDoctor);
router.get("/by-customer", getDoctorsByCustomer);
router.get("/filter-options", getDoctorFilterOptions);
router.get("/search-doctor-clinic", getDoctorOrClinicSearch);
router.get("/doctor-recommend", getDoctorRecommend);
router.get("/:slug", getDoctorDetail);
router.put("/:id", authMiddlewareDoctor, updateDoctor);
router.get("/schedule-booking/:doctorId", getScheduleByDoctor);

router.post("/reviews", authMiddlewareUser, createReviewDoctor);
router.put("/reviews/:id", authMiddlewareDoctor, updateReviewDoctor);
router.get("/reviews/by-customer/:doctor", getAllReviewByCustomer);
router.delete("/reviews/:id", authMiddlewareDoctor, removeReviewDoctor);
router.get("/reviews/:doctor", authMiddlewareDoctor, getAllReviewByDoctor);

router.post("/schedule", authMiddlewareDoctor, createSchedule);
router.put("/schedule/:id", authMiddlewareDoctor, updateSchedule);
router.delete("/schedule/:id", authMiddlewareDoctor, removeSchedule);
router.get("/schedule/:doctorId", getScheduleBooking);

export default router;
