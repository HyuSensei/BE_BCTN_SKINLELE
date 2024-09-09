import express from "express";
import { getAllBrand } from "../../controllers/brand.controller.js";

router.get("/", getAllBrand);

const router = express.Router();
