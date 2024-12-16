import {
  createDoctor,
  getAllDoctorsByAdmin,
  removeDoctor,
  updateDoctor,
} from "../../controllers/doctor.controller.js";

import express from "express";

const router = express.Router();

router.get("/", getAllDoctorsByAdmin);
router.post("/", createDoctor);
router.delete("/:id", removeDoctor);
router.put("/:id", updateDoctor);

export default router;
