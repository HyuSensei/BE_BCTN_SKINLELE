import express from "express";
import {
  createClinic,
  getAllClinic,
  getCliniDetailByAdmin,
  removeClinic,
  updateClinic,
  updateClinicByOwner,
} from "../../controllers/clinic.controller.js";
import {
  getAllReviewClinic,
  removeReviewClinic,
} from "../../controllers/review-clinic.controller.js";
import { getAllBookingByAdmin } from "../../controllers/booking.controller.js";
import { authMiddlewareAdmin } from "../../middleware/auth.middleware.js";
import { accessRole, ADMIN_ROLE, CLINIC_ROLE } from "../../ultis/getRole.js";
import { getClinicOverviewStats } from "../../controllers/statistical.controller.js";

const router = express.Router();

router.post("/", authMiddlewareAdmin(accessRole([CLINIC_ROLE])), createClinic);
router.get(
  "/detail",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE])),
  getCliniDetailByAdmin
);
router.put(
  "/:id",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE])),
  updateClinic
);
router.post(
  "/owner",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE])),
  updateClinicByOwner
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

router.get(
  "/statistical/:clinicId",
  authMiddlewareAdmin(accessRole([CLINIC_ROLE])),
  getClinicOverviewStats
);

export default router;
