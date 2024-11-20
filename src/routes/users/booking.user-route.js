import express from "express";
import {
  createBooking,
  getAllBookingByCustomer,
  getAllBookingByDoctor,
  getBookingDetail,
  updateStatusBooking,
} from "../../controllers/booking.controller.js";
import {
  authMiddlewareDoctor,
  authMiddlewareUser,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddlewareUser, createBooking);
router.put("/status/:id", authMiddlewareUser, updateStatusBooking);
router.get("/detail-customer/:id", authMiddlewareUser, getBookingDetail);
router.get("/detail-doctor/:id", authMiddlewareDoctor, getBookingDetail);
router.get("/customer", authMiddlewareUser, getAllBookingByCustomer);
router.get("/doctor", authMiddlewareDoctor, getAllBookingByDoctor);

export default router;
