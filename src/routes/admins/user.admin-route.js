import express from "express";
import {
  deleteUser,
  getAllUser,
  updateUser,
} from "../../controllers/user.controller.js";

const router = express.Router();

router.get("/", getAllUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
