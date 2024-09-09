import express from "express";
import {getProductPageSearch, 
  getListFromCategory,
  getProductDetailBySlug,
  getProductHome,
  getProductSearch,
} from "../../controllers/product.controller.js";

router.get("/categories/:slug", getListFromCategory);
router.get("/search", getProductSearch);
router.get("/detail/:slug", getProductDetailBySlug);
router.get("/home", getProductHome);
router.get("/search-page", getProductPageSearch);

const router = express.Router();
