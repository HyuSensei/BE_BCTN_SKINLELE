import Promotion from "../models/promotion.model.js";
import Product from "../models/product.model.js";

export const getDetailPromotion = async (req, res) => {
  try {
    const id = req.params.id;
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Khuyến mãi không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      data: promotion,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      data: {},
      error: error.message,
    });
  }
};

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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(pageSize))
      .populate("products.product", "name price");

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
    const { name, description, startDate, endDate, isActive, products } =
      req.body;

    if (products && products.length > 0) {
      const productIds = products.map((p) => p.product);
      const productCount = await Product.countDocuments({
        _id: { $in: productIds },
      });
      if (productCount !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: "Một số sản phẩm không tồn tại",
        });
      }
    }

    const newPromotion = new Promotion({
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive,
      products: products.map((item) => ({
        product: item.product,
        discountPercentage: item.discountPercentage,
        maxQty: item.maxQty,
      })),
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
    const { name, description, startDate, endDate, isActive, products } =
      req.body;

    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin khuyến mãi",
      });
    }

    if (products && products.length > 0) {
      const productIds = products.map((p) => p.product);
      const productCount = await Product.countDocuments({
        _id: { $in: productIds },
      });
      if (productCount !== productIds.length) {
        return res.status(400).json({
          success: false,
          message: "Một số sản phẩm không tồn tại",
        });
      }
    }

    promotion.name = name || promotion.name;
    promotion.description = description || promotion.description;
    promotion.startDate = startDate ? new Date(startDate) : promotion.startDate;
    promotion.endDate = endDate ? new Date(endDate) : promotion.endDate;
    promotion.isActive = isActive !== undefined ? isActive : promotion.isActive;

    if (products) {
      promotion.products = products.map((p) => ({
        product: p.product,
        discountPercentage: p.discountPercentage,
        maxQty: p.maxQty,
        usedQty: p.usedQty || 0,
      }));
    }

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
      message: "Có lỗi xảy ra khi xóa khuyến mãi",
      error: error.message,
    });
  }
};