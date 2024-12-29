import express from "express";
import {
  getProductPageSearch,
  getListFromCategory,
  getProductDetailBySlug,
  getProductHome,
  getProductSearch,
  getListFromBrand,
  getAllProductByUser,
  getProductPromotion,
} from "../../controllers/product-base.controller.js";

const router = express.Router();

router.get("/categories/:slug", getListFromCategory);
router.get("/brands/:slug", getListFromBrand);
router.get("/search", getProductSearch);
router.get("/detail/:slug", getProductDetailBySlug);
router.get("/home", getProductHome);
router.get("/search-page", getProductPageSearch);
router.get("/all-other", getAllProductByUser);
router.get("/promotions", getProductPromotion);

export default router;
