import express from "express";
import { getAllCategory } from "../../controllers/category.controller.js";

router.get("/", getAllCategory);

const router = express.Router();
