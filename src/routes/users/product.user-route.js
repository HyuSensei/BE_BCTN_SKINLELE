import express from "express";
import {
  getProductPageSearch,
  getListFromCategory,
  getProductDetailBySlug,
  getProductHome,
  getProductSearch,
  getListFromBrand,
} from "../../controllers/product.controller.js";

const router = express.Router();

router.get("/categories/:slug", getListFromCategory);
router.get("/brands/:slug", getListFromBrand);
router.get("/search", getProductSearch);
router.get("/detail/:slug", getProductDetailBySlug);
router.get("/home", getProductHome);
router.get("/search-page", getProductPageSearch);

export default router;
