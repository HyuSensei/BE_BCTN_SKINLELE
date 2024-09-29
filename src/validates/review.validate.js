import { body } from "express-validator";

export const createReviewValidate = [
  body("rate")
    .notEmpty()
    .withMessage("Vui lòng chọn mức độ hài lòng của bạn")
    .isInt({ min: 1, max: 5 })
    .withMessage("Đánh giá sao phải từ 1 đến 5"),
  body("comment").notEmpty().withMessage("Vui lòng nhập nội dung đánh giá"),
];
