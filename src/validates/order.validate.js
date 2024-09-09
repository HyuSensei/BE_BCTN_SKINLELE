import { body } from "express-validator";

export const createOrderValidate = [
  body("products")
    .isArray({ min: 1 })
    .withMessage("Vui lòng thêm sản phẩm vào giỏ hàng"),
  body("name").notEmpty().withMessage("Vui lòng nhập họ tên người nhận"),
  body("phone")
    .notEmpty()
    .withMessage("Vui lòng nhập số điện thoại người nhận"),
  body("totalAmount")
    .isNumeric()
    .withMessage("Tổng tiền không hợp lệ")
    .notEmpty()
    .withMessage("Tổng tiền không được để trống"),
  body("address").notEmpty().withMessage("Vui lòng cung cấp địa chỉ nhận hàng"),
  body("paymentMethod")
    .notEmpty()
    .withMessage("Vui lòng chọn phương thức thanh toán")
    .isIn(["COD", "STRIPE", "VNPAY"])
    .withMessage("Phương thức thanh toán không hợp lệ"),
  body("note").optional().isString().withMessage("Ghi chú không hợp"),
  body("province.name")
    .notEmpty()
    .withMessage("Tên tỉnh/thành phố không được để trống"),
  body("district.name")
    .notEmpty()
    .withMessage("Tên quận/huyện không được để trống"),
  body("ward.name").notEmpty().withMessage("Tên phường/xã không được để trống"),
  body().custom((value) => {
    if (!value.province || !value.district || !value.ward) {
      throw new Error(
        "Vui lòng cung cấp đầy đủ thông tin địa chỉ (tỉnh/thành phố, quận/huyện, phường/xã)"
      );
    }
    return true;
  }),
];
