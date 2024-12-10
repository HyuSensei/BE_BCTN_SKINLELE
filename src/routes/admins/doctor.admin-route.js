import {
  createDoctor,
  getAllDoctorByAdmin,
  removeDoctor,
  updateDoctor,
} from "../../controllers/doctor.controller.js";

import express from "express";

const router = express.Router();

router.get("/", getAllDoctorByAdmin);
router.post("/", createDoctor);
router.delete("/:id", removeDoctor);
router.put("/:id", updateDoctor);

export default router;
