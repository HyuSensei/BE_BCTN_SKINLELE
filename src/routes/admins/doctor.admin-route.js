import {
  createDoctor,
  getAllDoctorByAdmin,
  removeDoctor,
} from "../../controllers/doctor.controller.js";

import express from "express";

const router = express.Router();

router.get("/", getAllDoctorByAdmin);
router.post("/", createDoctor);
router.delete("/:id", removeDoctor);

export default router;
