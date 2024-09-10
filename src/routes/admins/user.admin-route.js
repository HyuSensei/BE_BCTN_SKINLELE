import express from "express";
import { getAllUser, updateUser } from "../../controllers/user.controller.js";

const router = express.Router();

router.get("/", getAllUser);
router.put("/:id", updateUser);

export default router;
