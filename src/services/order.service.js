// orderUtils.js
import Product from "../models/product.model.js";
import Promotion from "../models/promotion.model.js";

export const calculateOrderAmount = async (products, currentDate = new Date()) => {
  let totalAmount = 0;
  let calculatedProducts = [];

  // Lấy thông tin sản phẩm và khuyến mãi trong một lần query
  const productIds = products.map(item => item.productId);
  const [productList, activePromotions] = await Promise.all([
    Product.find({ _id: { $in: productIds } }),
    Promotion.find({
      'products.product': { $in: productIds },
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      isActive: true
    })
  ]);

  // Tạo map để tra cứu nhanh
  const productMap = new Map(productList.map(p => [p._id.toString(), p]));
  const promotionMap = new Map();
  
  activePromotions.forEach(promo => {
    promo.products.forEach(p => {
      promotionMap.set(p.product.toString(), {
        promotion: promo,
        discountPercentage: p.discountPercentage,
        maxQty: p.maxQty,
        usedQty: p.usedQty,
        maxDiscountAmount: p.maxDiscountAmount
      });
    });
  });

  for (const item of products) {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      throw new Error(`Không tìm thấy sản phẩm: ${item.productId}`);
    }

    // Kiểm tra tồn kho
    let availableQuantity;
    if (product.variants && product.variants.length > 0) {
      // Nếu có variants, kiểm tra số lượng trong variant cụ thể
      const variant = product.variants.find(v => 
        v.color.code === item.color?.code || 
        v.color.name === item.color?.name
      );
      if (!variant) {
        throw new Error(`Không tìm thấy phiên bản màu sắc cho sản phẩm ${product.name}`);
      }
      availableQuantity = variant.quantity;
    } else {
      // Nếu không có variants, sử dụng totalQuantity
      availableQuantity = product.totalQuantity;
    }

    if (availableQuantity < item.quantity) {
      throw new Error(
        `Sản phẩm ${product.name} không đủ số lượng trong kho (Yêu cầu: ${item.quantity}, Còn lại: ${availableQuantity})`
      );
    }

    // Tính giá với khuyến mãi nếu có
    let itemPrice = product.price;
    let discountAmount = 0;
    const promotionInfo = promotionMap.get(item.productId.toString());

    if (promotionInfo) {
      const { discountPercentage, maxQty, usedQty, maxDiscountAmount } = promotionInfo;
      const availablePromotionQty = maxQty - usedQty;
      
      if (availablePromotionQty > 0) {
        const promotionalQty = Math.min(item.quantity, availablePromotionQty);
        const regularQty = item.quantity - promotionalQty;
        
        // Tính giảm giá
        discountAmount = (itemPrice * promotionalQty * discountPercentage) / 100;
        
        // Áp dụng giới hạn giảm giá tối đa nếu có
        if (maxDiscountAmount > 0) {
          discountAmount = Math.min(discountAmount, maxDiscountAmount * promotionalQty);
        }
        
        // Tính giá cuối cùng
        itemPrice = (
          (itemPrice * promotionalQty - discountAmount) + 
          (itemPrice * regularQty)
        ) / item.quantity;
      }
    }

    const subtotal = itemPrice * item.quantity;
    totalAmount += subtotal;

    calculatedProducts.push({
      productId: item.productId,
      name: product.name,
      image: product.mainImage.url,
      color: item.color,
      price: itemPrice,
      originalPrice: product.price,
      quantity: item.quantity,
      discountAmount,
      subtotal,
    });
  }

  return {
    products: calculatedProducts,
    totalAmount: Math.round(totalAmount)
  };
};

export const updateInventory = async (products, session) => {
  const bulkOps = [];

  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new Error(`Không tìm thấy sản phẩm: ${item.productId}`);
    }

    if (product.variants && product.variants.length > 0) {
      // Cập nhật số lượng trong variant
      const updateQuery = {
        updateOne: {
          filter: { 
            _id: item.productId,
            'variants.color.code': item.color.code 
          },
          update: { 
            $inc: { 
              'variants.$.quantity': -item.quantity,
              'totalQuantity': -item.quantity  // Cập nhật tổng số lượng
            }
          }
        }
      };
      bulkOps.push(updateQuery);
    } else {
      // Cập nhật totalQuantity trực tiếp
      const updateQuery = {
        updateOne: {
          filter: { _id: item.productId },
          update: { 
            $inc: { 'totalQuantity': -item.quantity }
          }
        }
      };
      bulkOps.push(updateQuery);
    }
  }

  if (bulkOps.length > 0) {
    const result = await Product.bulkWrite(bulkOps, { session });
    return result;
  }
};

export const validateOrder = async (products) => {
  const errors = [];
  const productIds = products.map(p => p.productId);
  
  const productList = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(productList.map(p => [p._id.toString(), p]));

  for (const item of products) {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      errors.push(`Không tìm thấy sản phẩm: ${item.productId}`);
      continue;
    }

    if (!product.enable) {
      errors.push(`Sản phẩm ${product.name} hiện không khả dụng`);
      continue;
    }

    // Kiểm tra số lượng dựa trên loại sản phẩm
    if (product.variants && product.variants.length > 0) {
      if (!item.color) {
        errors.push(`Vui lòng chọn màu sắc cho sản phẩm ${product.name}`);
        continue;
      }

      const variant = product.variants.find(v => 
        v.color.code === item.color.code || 
        v.color.name === item.color.name
      );

      if (!variant) {
        errors.push(`Không tìm thấy màu sắc đã chọn cho sản phẩm ${product.name}`);
      } else if (variant.quantity < item.quantity) {
        errors.push(
          `Sản phẩm ${product.name} (${item.color.name}) không đủ số lượng trong kho (Yêu cầu: ${item.quantity}, Còn lại: ${variant.quantity})`
        );
      }
    } else {
      if (product.totalQuantity < item.quantity) {
        errors.push(
          `Sản phẩm ${product.name} không đủ số lượng trong kho (Yêu cầu: ${item.quantity}, Còn lại: ${product.totalQuantity})`
        );
      }
    }
  }

  return errors;
};

export const restoreProductQuantity = async (orderProducts) => {
  try {
    if (!Array.isArray(orderProducts) || orderProducts.length === 0) {
      return {
        success: false,
        message: "Không có sản phẩm để hoàn lại số lượng",
      };
    }

    const bulkOps = orderProducts.map((product) => ({
      updateOne: {
        filter: {
          _id: product.productId,
          "variants.color.code": product.color.code,
        },
        update: {
          $inc: {
            "variants.$.quantity": product.quantity,
            totalQuantity: product.quantity,
          },
        },
      },
    }));

    const result = await Product.bulkWrite(bulkOps);
    return { success: true, modifiedCount: result.modifiedCount };
  } catch (error) {
    console.error("Lỗi khi hoàn lại số lượng sản phẩm:", error);
    return { success: false, error: error.message };
  }
};