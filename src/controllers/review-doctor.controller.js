import mongoose, { Types } from "mongoose";
import Booking from "../models/booking.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";

export const getAllReviewByDoctor = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, rate, search } = req.query;
    const { doctor } = req.params;

    let filter = { doctor };
    if (rate) {
      filter.rate = parseInt(rate);
    }

    if (search) {
      filter.$or = [
        { "user.name": { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const [reviews, total, ratingStats] = await Promise.all([
      ReviewDoctor.find(filter)
        .populate("user", "name avatar")
        .populate("booking", "date")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      ReviewDoctor.countDocuments(filter),
      ReviewDoctor.aggregate([
        {
          $match: {
            doctor: new mongoose.Types.ObjectId(`${doctor}`),
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
          totalPage: Math.ceil(total / pageSize),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    console.log(error);
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
    const user = req.user._id;

    const review = await ReviewDoctor.findOne({
      _id: id,
      user,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá hoặc bạn không có quyền xóa",
      });
    }

    await review.remove();

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

    let filter = { doctor:new Types.ObjectId(`${doctor}`), isActive:true };
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
