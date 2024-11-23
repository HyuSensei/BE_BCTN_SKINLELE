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

const router = express.Router();

router.post("/", createClinic);
router.put("/:id", updateClinic);
router.delete("/:id", removeClinic);
router.get("/", getAllClinic);

router.get("/reviews", getAllReviewClinic);
router.delete("/reviews/:id", removeReviewClinic);

export default router;
