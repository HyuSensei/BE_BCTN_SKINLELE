import { body } from "express-validator";

export const createPromotionValidate = [
  body("name").notEmpty().withMessage("Vui lòng nhập tên khuyến mãi"),
  body("discountPercentage")
    .notEmpty()
    .withMessage("Vui lòng nhập phần trăm khuyến mãi"),
  body("startDate").notEmpty().withMessage("Vui lòng nhập ngày bắt đầu"),
  body("endDate").notEmpty().withMessage("Vui lòng nhập ngày kết thúc"),
  body("maxQty").notEmpty().withMessage("Vui lòng nhập số lượng tối đa"),
];
