import Promotion from "../models/promotion.model.js";
import Product from "../models/product.model.js";
import moment from "moment-timezone";

export const updatePromotionAfterOrder = async (products) => {
  const currentDate = new Date();

  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    const promotion = await Promotion.findOne({
      "products.product": item.productId,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      isActive: true,
    });

    if (promotion) {
      const productIndex = promotion.products.findIndex(
        (p) => p.product.toString() === item.productId.toString()
      );

      if (productIndex !== -1) {
        promotion.products[productIndex].usedQty += item.quantity;

        if (
          promotion.products[productIndex].usedQty >=
          promotion.products[productIndex].maxQty
        ) {
          promotion.products.splice(productIndex, 1);
        }

        if (promotion.products.length === 0) {
          await Promotion.findByIdAndDelete(promotion._id);
        } else {
          await promotion.save();
        }
      }
    }
  }
};

export const hideExpiredPromotions = async () => {
  try {
    moment.tz.setDefault("Asia/Ho_Chi_Minh");
    const currentTime = moment().toDate();
    const result = await Promotion.updateMany(
      {
        endDate: { $lt: currentTime },
        isActive: true,
      },
      {
        $set: { isActive: false },
      }
    );

    console.log(`Ngừng hoạt ${result.modifiedCount} khuyến mãi.`);

    return result.modifiedCount;
  } catch (error) {
    console.error("Error hiding expired promotions:", error);
    throw error;
  }
};
