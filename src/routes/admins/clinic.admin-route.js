import express from "express";
import {
  createClinic,
  getAllClinic,
  removeClinic,
  updateClinic,
} from "../../controllers/clinic.controller.js";
import {
  getAllReviewClinic,
  removeReviewClinic,
} from "../../controllers/review-clinic.controller.js";
import { getAllBookingByAdmin } from "../../controllers/booking.controller.js";
import { authMiddlewareAdmin } from "../../middleware/auth.middleware.js";
import { accessRole, ADMIN_ROLE, CLINIC_ROLE } from "../../ultis/getRole.js";

const router = express.Router();

router.post("/", authMiddlewareAdmin(accessRole([CLINIC_ROLE])), createClinic);
router.put(
  "/:id",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE])),
  updateClinic
);
router.delete("/:id", removeClinic);
router.get("/", authMiddlewareAdmin(accessRole([ADMIN_ROLE])), getAllClinic);

router.get(
  "/reviews",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE])),
  getAllReviewClinic
);
router.delete(
  "/reviews/:id",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE])),
  removeReviewClinic
);

router.get(
  "/bookings",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE])),
  getAllBookingByAdmin
);

export default router;
