import express from "express";
import { getAllUser, updateUser } from "../../controllers/user.controller.js";

router.get("/", getAllUser);
router.put("/:id", updateUser);

const router = express.Router();
