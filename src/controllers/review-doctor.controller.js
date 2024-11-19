import Booking from "../models/booking.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";

export const getAllReviewByDoctor = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const { doctor } = req.params;
    const skip = (page - 1) * pageSize;

    const [reviews, total] = await Promise.all([
      ReviewDoctor.find({ doctor })
        .populate("user", "name avatar")
        .populate("booking", "date")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      ReviewDoctor.countDocuments({ doctor }),
    ]);

    const averageRating = await ReviewDoctor.aggregate([
      { $match: { doctor: new mongoose.Types.ObjectId(doctor) } },
      { $group: { _id: null, average: { $avg: "$rate" } } },
    ]);

    return res.status(200).json({
      success: true,
      data: reviews,
      averageRating: averageRating[0]?.average || 0,
      pagination: {
        page,
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
        pageSize,
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

export const createReviewDoctor = async (req, res) => {
  try {
    const user = req.user._id;
    const { doctor, booking, rate, content } = req.body;

    const existingReview = await ReviewDoctor.findOne({
      user,
      booking,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã đánh giá cho lịch khám này",
      });
    }

    const bookingExists = await Booking.findOne({
      _id: booking,
      user,
      doctor,
      status: "completed",
    });

    if (!bookingExists) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy lịch khám hoặc lịch khám chưa hoàn thành",
      });
    }

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
