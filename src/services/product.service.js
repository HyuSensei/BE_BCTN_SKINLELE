import Product from "../models/product.model.js";
import moment from "moment-timezone";

export const updateExpiredProduct = async () => {
  try {
    const vietnamTime = moment().tz("Asia/Ho_Chi_Minh");
    const sixMonthsFromNow = vietnamTime.clone().add(6, "months");
    const twoMonthsFromNow = vietnamTime.clone().add(2, "months");

    const almostExpiredProducts = await Product.updateMany(
      {
        expiry: {
          $lte: sixMonthsFromNow.toDate(),
          $gt: twoMonthsFromNow.toDate(),
        },
        $or: [
          { isAlmostExpired: { $exists: false } },
          { isAlmostExpired: false },
        ],
      },
      {
        $set: { isAlmostExpired: true },
      }
    );

    console.log(
      `📈Đã cập nhật ${almostExpiredProducts.modifiedCount} sản phẩm sắp hết hạn📈`
    );

    const expiredProducts = await Product.updateMany(
      {
        expiry: { $lte: twoMonthsFromNow.toDate() },
        $or: [{ isExpired: { $exists: false } }, { isExpired: false }],
      },
      {
        $set: { isExpired: true, enable: false, isAlmostExpired: false },
      }
    );

    console.log(
      `🚫Đã cập nhật ${expiredProducts.modifiedCount} sản phẩm hết hạn🚫`
    );
  } catch (error) {
    console.error("💥Lỗi khi cập nhật trạng thái sản phẩm💥", error);
  }
};
