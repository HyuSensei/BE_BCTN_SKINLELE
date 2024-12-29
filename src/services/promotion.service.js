import Promotion from "../models/promotion.model.js";
import Product from "../models/product.model.js";
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Ho_Chi_Minh");

export const updatePromotionAfterOrder = async (products) => {
  try {
    const currentDate = new Date();
    const updatedPromotions = new Set(); 

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        console.log(`⚠️ Không tìm thấy sản phẩm: ${item.productId}`);
        continue;
      }

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
          const promotionProduct = promotion.products[productIndex];
          const newUsedQty = promotionProduct.usedQty + item.quantity;

          const remainingQty =
            promotionProduct.maxQty - promotionProduct.usedQty;

          if (remainingQty < item.quantity) {
            console.log(
              `⚠️ Khuyến mãi "${promotion.name}" - Sản phẩm ${product.name} vượt quá số lượng cho phép (Yêu cầu: ${item.quantity}, Còn lại: ${remainingQty})`
            );
          }

          promotion.products[productIndex].usedQty = Math.min(
            newUsedQty,
            promotionProduct.maxQty
          );

          const allProductsExhausted = promotion.products.every(
            (p) => p.usedQty >= p.maxQty
          );

          if (allProductsExhausted) {
            promotion.isActive = false;
            console.log(
              `🔚 Khuyến mãi "${promotion.name}" đã bị tắt do hết số lượng cho tất cả sản phẩm`
            );
          }

          updatedPromotions.add(promotion);
        }
      }
    }

    const updatePromises = Array.from(updatedPromotions).map(
      async (promotion) => {
        try {
          await promotion.save();
          console.log(`✅ Đã cập nhật khuyến mãi "${promotion.name}"`);
        } catch (error) {
          console.error(
            `❌ Lỗi khi cập nhật khuyến mãi "${promotion.name}":`,
            error
          );
        }
      }
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("💥 Lỗi khi cập nhật khuyến mãi sau đơn hàng:", error);
    throw error;
  }
};

export const hideExpiredPromotions = async () => {
  try {
    const currentTime = moment().toDate();

    const activePromotions = await Promotion.find({ isActive: true });
    let deactivatedCount = 0;

    for (const promotion of activePromotions) {
      let shouldDeactivate = false;

      if (moment(promotion.endDate).isBefore(currentTime)) {
        shouldDeactivate = true;
      } else {
        const allProductsExhausted = promotion.products.every(
          (product) => product.usedQty >= product.maxQty
        );

        if (allProductsExhausted) {
          shouldDeactivate = true;
        }
      }

      if (shouldDeactivate) {
        await Promotion.updateOne(
          { _id: promotion._id },
          { $set: { isActive: false } }
        );
        deactivatedCount++;

        const reason = moment(promotion.endDate).isBefore(currentTime)
          ? "hết hạn"
          : "hết số lượng";
        console.log(`Khuyến mãi "${promotion.name}" đã bị tắt do ${reason}`);
      }
    }

    if (deactivatedCount > 0) {
      console.log(`🔄 Đã ngừng hoạt động ${deactivatedCount} khuyến mãi`);
    } else {
      console.log("✨ Không có khuyến mãi nào cần ngừng hoạt động");
    }

    return deactivatedCount;
  } catch (error) {
    console.error("💥 Lỗi khi cập nhật trạng thái khuyến mãi:", error);
    throw error;
  }
};
