import express from "express";
import {
  getDoctorDetail,
  updateDoctor,
} from "../../controllers/doctor.controller.js";
import { authMiddlewareDoctor } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:slug", getDoctorDetail);
router.put("/", authMiddlewareDoctor, updateDoctor);

export default router;
