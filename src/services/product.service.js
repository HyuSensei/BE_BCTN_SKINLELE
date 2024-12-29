import Product from "../models/product.model.js";
import moment from "moment-timezone";
// Define thresholds
const ALMOST_EXPIRED_THRESHOLD = 30; // 30% of shelf life remaining
const EXPIRED_THRESHOLD = 10; // 10% of shelf life remaining

export const updateExpiredProduct = async () => {
  try {
    const vietnamTime = moment().tz("Asia/Ho_Chi_Minh");

    // Get all active products with expiration dates
    const products = await Product.find({
      expiry: { $exists: true },
      enable: true,
    });

    let almostExpiredCount = 0;
    let expiredCount = 0;

    for (const product of products) {
      const manufactureDate = moment(product.createdAt);
      const expiryDate = moment(product.expiry);
      const totalShelfLife = expiryDate.diff(manufactureDate, "days");
      const remainingTime = expiryDate.diff(vietnamTime, "days");

      // Calculate remaining shelf life percentage
      const remainingPercentage = (remainingTime / totalShelfLife) * 100;

      const updates = {};

      if (remainingPercentage <= EXPIRED_THRESHOLD || remainingTime <= 0) {
        // Product is expired
        updates.isExpired = true;
        updates.enable = false;
        updates.isAlmostExpired = false;
        expiredCount++;
      } else if (remainingPercentage <= ALMOST_EXPIRED_THRESHOLD) {
        // Product is almost expired
        updates.isAlmostExpired = true;
        updates.isExpired = false;
        almostExpiredCount++;
      }

      if (Object.keys(updates).length > 0) {
        await Product.updateOne({ _id: product._id }, { $set: updates });
      }
    }

    console.log(
      `📈 Đã cập nhật ${almostExpiredCount} sản phẩm sắp hết hạn (còn dưới ${ALMOST_EXPIRED_THRESHOLD}% thời hạn sử dụng) 📈`
    );
    console.log(
      `🚫 Đã cập nhật ${expiredCount} sản phẩm hết hạn (còn dưới ${EXPIRED_THRESHOLD}% thời hạn sử dụng) 🚫`
    );
  } catch (error) {
    console.error("💥 Lỗi khi cập nhật trạng thái sản phẩm 💥", error);
  }
};
