import express from "express";
import { getStatistics } from "../../controllers/statistical.controller.js";

const router = express.Router();

router.get("/", getStatistics);

export default router;
