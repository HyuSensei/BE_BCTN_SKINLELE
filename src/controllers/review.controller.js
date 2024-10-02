import Review from "../models/review.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";

export const createReview = async (req, res) => {
  try {
    const { order, product, rate, comment, images } = req.body;
    const user = req.user._id;

    const dataProduct = await Product.findById(product);
    if (!dataProduct) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại",
      });
    }

    if (order && order.trim() !== "") {
      const orderData = await Order.findById(order);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: "Đơn hàng không tồn tại",
        });
      }

      const productIndex = orderData.products.findIndex(
        (p) => p.productId.toString() === product
      );

      if (productIndex === -1) {
        return res.status(400).json({
          success: false,
          message: "Sản phẩm không tồn tại trong đơn hàng này",
        });
      }

      if (orderData.products[productIndex].isReviewed) {
        return res.status(400).json({
          success: false,
          message: "Sản phẩm này đã được đánh giá",
        });
      }

      orderData.products[productIndex].isReviewed = true;
      await orderData.save();
    }

    const reviewData = {
      user,
      product,
      rate,
      comment,
      images,
    };

    if (order && order.trim() !== "") {
      reviewData.order = order;
    }

    const newReview = await Review.create(reviewData);

    res.status(201).json({
      success: true,
      message: "Đánh giá sản phẩm thành công",
      data: newReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra đánh giá sản phẩm",
      error: error.message,
    });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, comment, images, reply, display } = req.body;
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa",
      });
    }
    review.rate = rate || review.rate;
    review.comment = comment || review.comment;
    review.images = images || review.images;
    review.reply = reply || review.reply;
    if (display !== undefined) review.display = display;

    const updatedReview = await review.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin đánh giá thành công",
      data: updatedReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật đánh giá",
      error: error.message,
    });
  }
};

export const removeReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá",
      });
    }

    await Review.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Xóa đánh giá thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xóa đánh giá",
      error: error.message,
    });
  }
};

export const getReviewByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, pageSize = 10, rate, hasImage, hasComment } = req.query;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại",
        data: [],
      });
    }

    const baseFilter = { product: product._id, display: true };
    let filter = { ...baseFilter };

    if (rate) {
      filter.rate = parseInt(rate);
    }
    if (hasImage === "true") {
      filter["images.0"] = { $exists: true };
    }
    if (hasComment === "true") {
      filter.comment = { $ne: "" };
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [reviews, total, allReviews] = await Promise.all([
      Review.find(filter)
        .populate({
          path: "user",
          select: "_id name email avatar",
        })
        .skip(skip)
        .limit(parseInt(pageSize))
        .sort({ createdAt: -1 }),
      Review.countDocuments(filter),
      Review.find(baseFilter).select("rate"),
    ]);

    const rateDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let totalRating = 0;
    allReviews.forEach((review) => {
      rateDistribution[review.rate]++;
      totalRating += review.rate;
    });

    const averageRating =
      allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        totalPage: Math.ceil(total / parseInt(pageSize)),
        totalItems: total,
        pageSize: parseInt(pageSize),
      },
      rateDistribution,
      averageRating,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};

export const getReviewByAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { rate, customerName, productName, fromDate, toDate } = req.query;
    const skip = (page - 1) * pageSize;

    let matchStage = {};

    if (rate && parseInt(rate) > 0) {
      matchStage.rate = parseInt(rate);
    }

    if (fromDate && toDate) {
      matchStage.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $match: {
          ...matchStage,
          ...(customerName
            ? { "userDetails.name": { $regex: customerName, $options: "i" } }
            : {}),
          ...(productName
            ? { "productDetails.name": { $regex: productName, $options: "i" } }
            : {}),
        },
      },
      {
        $project: {
          _id: 1,
          rate: 1,
          comment: 1,
          createdAt: 1,
          user: { _id: "$userDetails._id", name: "$userDetails.name" },
          product: {
            _id: "$productDetails._id",
            name: "$productDetails.name",
            mainImage: "$productDetails.mainImage",
          },
          display: 1,
          reply: 1,
          images: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page, pageSize } }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      },
    ];

    const [result] = await Review.aggregate(pipeline);

    const reviews = result.data;
    const metadata = result.metadata[0];

    return res.status(200).json({
      success: true,
      data: reviews,
      pagination: metadata
        ? {
            page: metadata.page,
            pageSize: metadata.pageSize,
            totalPage: Math.ceil(metadata.total / metadata.pageSize),
            totalItems: metadata.total,
          }
        : {
            page: page,
            pageSize: pageSize,
            totalPage: 0,
            totalItems: 0,
          },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: [],
      error: error.message,
    });
  }
};
