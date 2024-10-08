import { body } from "express-validator";

export const createPromotionValidate = [
  body("name").notEmpty().withMessage("Vui lòng nhập tên khuyến mãi"),
  body("startDate").notEmpty().withMessage("Vui lòng nhập ngày bắt đầu"),
  body("endDate").notEmpty().withMessage("Vui lòng nhập ngày kết thúc"),
];
