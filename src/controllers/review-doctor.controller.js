import mongoose, { Types } from "mongoose";
import Booking from "../models/booking.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";

export const getAllReviewByDoctor = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, rate, search } = req.query;
    const doctorId = req.user._id;

    let filter = { doctor: doctorId };

    if (rate) {
      filter.rate = parseInt(rate);
    }

    if (search) {
      const reviews = await ReviewDoctor.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $match: {
            doctor: doctorId,
            "userDetails.name": { $regex: search, $options: "i" },
          },
        },
      ]);

      const reviewIds = reviews.map((review) => review._id);
      filter._id = { $in: reviewIds };
    }

    const [reviews, total, ratingStats] = await Promise.all([
      ReviewDoctor.find(filter)
        .populate("user", "name email avatar")
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      ReviewDoctor.countDocuments(filter),
      ReviewDoctor.aggregate([
        {
          $match: {
            doctor: new mongoose.Types.ObjectId(`${doctorId}`),
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rate" },
            totalReviews: { $sum: 1 },
            ratingCounts: {
              $push: "$rate",
            },
          },
        },
      ]),
    ]);

    const stats = ratingStats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratingCounts: [],
    };

    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    stats.ratingCounts.forEach((rate) => {
      ratingDistribution[rate] = (ratingDistribution[rate] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        stats: {
          totalReviews: stats.totalReviews,
          averageRating: Number(stats.averageRating.toFixed(1)),
          ratingDistribution,
        },
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPage: Math.ceil(total / parseInt(pageSize)),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đánh giá",
      error: error.message,
      data: [],
    });
  }
};

export const createReviewDoctor = async (req, res) => {
  try {
    const user = req.user._id;
    const { doctor, booking = null, rate, content } = req.body;

    // const existingReview = await ReviewDoctor.findOne({
    //   user,
    //   booking,
    // });

    // if (existingReview) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Bạn đã đánh giá cho lịch khám này",
    //   });
    // }

    // const bookingExists = await Booking.findOne({
    //   _id: booking,
    //   user,
    //   doctor,
    //   status: "completed",
    // });

    // if (!bookingExists) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Không tìm thấy lịch khám hoặc lịch khám chưa hoàn thành",
    //   });
    // }

    const review = await ReviewDoctor.create({
      doctor,
      user,
      booking,
      rate,
      content,
    });

    return res.status(201).json({
      success: true,
      message: "Đánh giá bác sĩ thành công",
      data: review,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo đánh giá bác sĩ",
      error: error.message,
    });
  }
};

export const removeReviewDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = req.user._id;

    const review = await ReviewDoctor.findOneAndDelete({
      _id: id,
      doctor,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá hoặc bạn không có quyền xóa",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Xóa đánh giá thành công",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra xóa thông tin đánh giá",
      error: error.message,
    });
  }
};

export const getAllReviewByCustomer = async (req, res) => {
  try {
    const { doctor } = req.params;

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const { rate } = req.query;

    let filter = { doctor: new Types.ObjectId(`${doctor}`), isActive: true };
    if (rate) {
      filter.rate = parseInt(rate);
    }

    const total = await ReviewDoctor.countDocuments(filter);

    const hasMore = page * pageSize < total;

    const reviews = await ReviewDoctor.find(filter)
      .populate("user", "name avatar")
      .populate("booking", "date")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const stats = await ReviewDoctor.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rate" },
          totalReviews: { $sum: 1 },
          ratingDistribution: { $push: "$rate" },
        },
      },
    ]);

    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    if (stats[0]) {
      stats[0].ratingDistribution.forEach((rating) => {
        ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        hasMore,
        pagination: {
          page,
          totalPage: Math.ceil(total / pageSize),
          totalItems: total,
          pageSize,
        },
        stats: {
          averageRating: stats[0]?.averageRating
            ? Number(stats[0].averageRating.toFixed(1))
            : 0,
          totalReviews: stats[0]?.totalReviews || 0,
          ratingDistribution,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
      data: [],
    });
  }
};

export const updateReviewDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, content, isActive } = req.body;
    const doctor = req.user._id;

    const review = await ReviewDoctor.findOne({
      _id: id,
      doctor,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa",
      });
    }

    if (rate) {
      if (![1, 2, 3, 4, 5].includes(rate)) {
        return res.status(400).json({
          success: false,
          message: "Đánh giá phải từ 1 đến 5 sao",
        });
      }
      review.rate = rate;
    }

    if (content) {
      review.content = content.trim();
    }

    if (typeof isActive === "boolean") {
      review.isActive = isActive;
    }

    const updatedReview = await review.save();

    await updatedReview.populate([
      {
        path: "user",
        select: "name avatar",
      },
      {
        path: "doctor",
        select: "name avatar",
      },
      {
        path: "booking",
        select: "date",
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Cập nhật đánh giá thành công",
      data: updatedReview,
    });
  } catch (error) {
    console.error("Update review error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật đánh giá",
      error: error.message,
    });
  }
};
