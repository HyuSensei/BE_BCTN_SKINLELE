import express from "express";
import {
  createSchedule,
  getScheduleByDoctor,
  removeSchedule,
  updateSchedule,
} from "../../controllers/schedule.controller.js";
import { authMiddlewareDoctor } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddlewareDoctor, createSchedule);
router.put("/:id", authMiddlewareDoctor, updateSchedule);
router.delete("/:id", authMiddlewareDoctor, removeSchedule);
router.get("/:doctorId", getScheduleByDoctor);

export default router;
