import express from "express";
import {
  getDoctorDetail,
  getDoctorsByCustomer,
  getScheduleByDoctor,
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
import {
  createSchedule,
  getScheduleBooking,
  removeSchedule,
  updateSchedule,
} from "../../controllers/schedule.controller.js";

const router = express.Router();

router.get("/statistical", authMiddlewareDoctor, getStatisticalDoctor);
router.get("/by-customer", getDoctorsByCustomer);
router.get("/:slug", getDoctorDetail);
router.put("/:id", authMiddlewareDoctor, updateDoctor);
router.get("/schedule-booking/:doctorId", getScheduleByDoctor);

router.get("/reviews/:doctor", getAllReviewByDoctor);
router.post("/reviews", authMiddlewareUser, createReviewDoctor);
router.delete("/reviews/:id", authMiddlewareDoctor, removeReviewDoctor);

router.post("/schedule", authMiddlewareDoctor, createSchedule);
router.put("/schedule/:id", authMiddlewareDoctor, updateSchedule);
router.delete("/schedule/:id", authMiddlewareDoctor, removeSchedule);
router.get("/schedule/:doctorId", getScheduleBooking);

export default router;
