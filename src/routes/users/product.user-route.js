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
  getProductFilters,
} from "../../controllers/product-base.controller.js";
import { getPromotionActive } from "../../controllers/promotion.controller.js";

const router = express.Router();

router.get("/search", getProductSearch);
router.get("/home", getProductHome);
router.get("/search-page", getProductPageSearch);
router.get("/all-other", getAllProductByUser);
router.get("/promotions", getProductPromotion);
router.get("/promotions-info", getPromotionActive);
router.get("/filter-options", getProductFilters);
router.get("/detail/:slug", getProductDetailBySlug);
router.get("/categories/:slug", getListFromCategory);
router.get("/brands/:slug", getListFromBrand);

export default router;
