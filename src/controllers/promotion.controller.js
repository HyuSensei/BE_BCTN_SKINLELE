import Promotion from "../models/promotion.model.js";
import Product from "../models/product.model.js";

export const getAllPromotions = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, pageSize = 10 } = req.query;

    let query = {};

    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    const skip = (page - 1) * pageSize;

    const promotions = await Promotion.find(query)
      .sort({ discountPercentage: -1 })
      .skip(skip)
      .limit(Number(pageSize))
      .populate("products", "name price");

    const total = await Promotion.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: promotions,
      pagination: {
        page: Number(page),
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      data: [],
      error: error.message,
    });
  }
};

export const createPromotion = async (req, res) => {
  try {
    const {
      name,
      description,
      discountPercentage,
      startDate,
      endDate,
      isActive,
      maxQty,
      products,
    } = req.body;

    if (products && products.length > 0) {
      const productCount = await Product.countDocuments({
        _id: { $in: products },
      });
      if (productCount !== products.length) {
        return res.status(400).json({
          success: false,
          message: "Một số sản phẩm không tồn tại",
        });
      }
    }

    const newPromotion = new Promotion({
      name,
      description,
      discountPercentage,
      startDate,
      endDate,
      isActive,
      maxQty,
      products,
    });

    const savedPromotion = await newPromotion.save();

    return res.status(201).json({
      success: true,
      message: "Tạo thông tin khuyến mãi thành công",
      data: savedPromotion,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo khuyến mãi",
      error: error.message,
    });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      discountPercentage,
      startDate,
      endDate,
      isActive,
      maxQty,
      products,
    } = req.body;

    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin khuyến mãi",
      });
    }

    if (products && products.length > 0) {
      const productCount = await Product.countDocuments({
        _id: { $in: products },
      });
      if (productCount !== products.length) {
        return res.status(400).json({
          success: false,
          message: "Một số sản phẩm không tồn tại",
        });
      }
    }

    promotion.name = name || promotion.name;
    promotion.description = description || promotion.description;
    promotion.discountPercentage =
      discountPercentage || promotion.discountPercentage;
    promotion.startDate = startDate || promotion.startDate;
    promotion.endDate = endDate || promotion.endDate;
    promotion.isActive = isActive !== undefined ? isActive : promotion.isActive;
    promotion.maxQty = maxQty || promotion.maxQty;
    promotion.products = products || promotion.products;

    const updatedPromotion = await promotion.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật khuyến mãi thành công",
      data: updatedPromotion,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật khuyến mãi",
      error: error.message,
    });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin khuyến mãi",
      });
    }

    await Promotion.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa khuyến mãi thành công",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xả ra khi xóa khuyến mãi",
      error: error.message,
    });
  }
};
