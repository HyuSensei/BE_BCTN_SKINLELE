import { body } from "express-validator";

export const createReviewValidate = [
  body("rate")
    .notEmpty()
    .withMessage("Đánh giá sao là bắt buộc")
    .isInt({ min: 1, max: 5 })
    .withMessage("Đánh giá sao phải từ 1 đến 5"),
  body("comment")
    .notEmpty()
    .withMessage("Nội dung đánh giá là bắt buộc")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Nội dung đánh giá không được để trống"),
];
