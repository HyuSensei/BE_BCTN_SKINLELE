import express from "express";
import {
  createBooking,
  getAllBookingByCustomer,
  getAllBookingByDoctor,
  getBookingDetail,
  updateBookingInfo,
  updateStatusBooking,
} from "../../controllers/booking.controller.js";
import {
  authMiddlewareDoctor,
  authMiddlewareUser,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddlewareUser, createBooking);
router.get("/customer", authMiddlewareUser, getAllBookingByCustomer);
router.get("/by-doctor", authMiddlewareDoctor, getAllBookingByDoctor);
router.put("/status/:id", authMiddlewareUser, updateStatusBooking);
router.put("/customer-info/:id", authMiddlewareUser, updateBookingInfo);
router.get("/detail-customer/:id", authMiddlewareUser, getBookingDetail);
router.get("/detail-doctor/:id", authMiddlewareDoctor, getBookingDetail);

export default router;
