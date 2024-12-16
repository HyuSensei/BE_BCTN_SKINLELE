import ReviewClinic from "../models/review-clinic.model.js";
import Clinic from "../models/clinic.model.js";
import Booking from "../models/booking.model.js";

export const createReviewClinic = async (req, res) => {
  try {
    const { clinic, rate, content } = req.body;
    const user = req.user._id;

    if (rate < 1 || rate > 5) {
      return res.status(400).json({
        success: false,
        message: "Đánh giá phải từ 1 đến 5 sao",
      });
    }

    const clinicExists = await Clinic.findById(clinic);
    if (!clinicExists) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phòng khám",
      });
    }

    const hasBooking = await Booking.findOne({
      user,
      clinic,
      status: "completed",
    });

    if (!hasBooking) {
      return res.status(400).json({
        success: false,
        message: "Bạn cần có lịch khám đã hoàn thành để đánh giá phòng khám",
      });
    }

    const existingReview = await ReviewClinic.findOne({
      user,
      clinic,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đánh giá phòng khám này",
      });
    }

    const review = await ReviewClinic.create({
      clinic,
      user,
      rate,
      content: content.trim(),
    });

    const populatedReview = await ReviewClinic.findById(review._id)
      .populate("user", "name avatar")
      .populate("clinic", "name");

    return res.status(201).json({
      success: true,
      message: "Đánh giá phòng khám thành công",
      data: populatedReview,
    });
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo đánh giá",
      error: error.message,
    });
  }
};

export const getAllReviewClinic = async (req, res) => {
  try {
    const {
      clinicId,
      page = 1,
      pageSize = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
      rating,
    } = req.query;

    let filter = {};

    if (clinicId) {
      filter.clinic = clinicId;
    }

    if (rating) {
      filter.rate = parseInt(rating);
    }

    const [reviews, total] = await Promise.all([
      ReviewClinic.find(filter)
        .populate("user", "name avatar")
        .populate("clinic", "name")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      ReviewClinic.countDocuments(filter),
    ]);

    // Initialize default rating distribution with all ratings set to 0
    const defaultRatingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    const stats = await ReviewClinic.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rate" },
          ratingDistribution: {
            $push: "$rate",
          },
        },
      },
    ]);

    // Merge actual ratings with default distribution
    const ratingDistribution =
      stats[0]?.ratingDistribution.reduce(
        (acc, rate) => {
          acc[rate] = (acc[rate] || 0) + 1;
          return acc;
        },
        { ...defaultRatingDistribution }
      ) || defaultRatingDistribution;

    const currentPage = parseInt(page);
    const totalPages = Math.ceil(total / parseInt(pageSize));
    const hasMore = currentPage < totalPages;

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: currentPage,
          pageSize: parseInt(pageSize),
          totalPage: totalPages,
          totalItems: total,
        },
        hasMore,
        stats: {
          averageRating: stats[0]?.averageRating || 0,
          totalReviews: total,
          ratingDistribution,
        },
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đánh giá",
      error: error.message
    });
  }
};

export const removeReviewClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const review = await ReviewClinic.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đánh giá",
      });
    }

    if (
      review.user.toString() !== user._id.toString() &&
      user.role !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa đánh giá này",
      });
    }

    await ReviewClinic.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa đánh giá thành công",
    });
  } catch (error) {
    console.error("Remove review error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa đánh giá",
      error: error.message,
    });
  }
};
