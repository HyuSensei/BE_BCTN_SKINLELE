import moment from "moment";
import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";

export const createDoctor = async (req, res) => {
  try {
    const admin = req.admin._id;
    const {
      name,
      email,
      password,
      about,
      phone,
      fees,
      avatar,
      specialty,
      experience,
      duration,
      holidays,
    } = req.body;

    const clinic = await Clinic.findOne({ admin });
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám!",
      });
    }

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại, vui lòng thử lại!",
      });
    }

    if (holidays) {
      const processedHolidays = holidays.map((date) => new Date(date));
      const uniqueDates = new Set(
        processedHolidays.map((date) => moment(date).format("YYYY-MM-DD"))
      );

      if (uniqueDates.size !== processedHolidays.length) {
        return res.status(400).json({
          success: false,
          message: "Không thể đặt trùng ngày nghỉ",
        });
      }
    }

    const newDoctor = new Doctor({
      clinic: clinic._id,
      name,
      email,
      password,
      about,
      phone,
      fees,
      avatar,
      specialty,
      experience,
      duration: duration || 15,
      holidays: holidays?.map((date) => new Date(date)) || [],
    });

    const savedDoctor = await newDoctor.save();

    return res.status(201).json({
      success: true,
      message: "Tạo mới thông tin bác sĩ thành công",
      data: savedDoctor,
    });
  } catch (error) {
    console.error("Create doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo thông tin bác sĩ",
      error: error.message,
    });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      password,
      about,
      phone,
      fees,
      avatar,
      specialty,
      experience,
      duration,
      holidays,
      isActive,
    } = req.body;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ",
      });
    }

    if (email && email !== doctor.email) {
      const existingDoctor = await Doctor.findOne({ email });
      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          message: "Email đã tồn tại, vui lòng thử lại!",
        });
      }
    }

    let processedHolidays = doctor.holidays;
    if (holidays) {
      processedHolidays = holidays.map((date) => new Date(date));
      const uniqueDates = new Set(
        processedHolidays.map((date) => moment(date).format("YYYY-MM-DD"))
      );

      if (uniqueDates.size !== processedHolidays.length) {
        return res.status(400).json({
          success: false,
          message: "Không thể đặt trùng ngày nghỉ",
        });
      }
    }

    if (name) doctor.name = name;
    if (email) doctor.email = email;
    if (password) doctor.password = password;
    if (about) doctor.about = about;
    if (phone) doctor.phone = phone;
    if (fees) doctor.fees = fees;
    if (avatar) doctor.avatar = avatar;
    if (specialty) doctor.specialty = specialty;
    if (experience) doctor.experience = experience;
    if (duration) doctor.duration = duration;
    if (holidays) doctor.holidays = processedHolidays;
    if (isActive !== undefined) doctor.isActive = isActive;

    const updatedDoctor = await doctor.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin bác sĩ thành công",
      data: updatedDoctor,
    });
  } catch (error) {
    console.error("Update doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật thông tin bác sĩ",
      error: error.message,
    });
  }
};

export const removeDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ",
      });
    }

    const hasActiveSchedule = await Schedule.exists({
      doctor: id,
      "schedule.isActive": true,
    });

    if (hasActiveSchedule) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa bác sĩ đang có lịch làm việc",
      });
    }

    await Promise.all([
      Doctor.findByIdAndDelete(id),
      Schedule.deleteMany({ doctor: id }),
      ReviewDoctor.deleteMany({ doctor: id }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Xóa thông tin bác sĩ thành công",
    });
  } catch (error) {
    console.error("Remove doctor error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xóa thông tin bác sĩ",
      error: error.message,
    });
  }
};

export const getDoctorDetail = async (req, res) => {
  try {
    const { slug } = req.params;

    const doctor = await Doctor.findOne({ slug, isActive: true })
      .select("-password -__v")
      .populate("clinic", "-__v -createdAt -updatedAt")
      .lean();

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ",
        data: {},
      });
    }

    const [schedule, reviewStats] = await Promise.all([
      Schedule.findOne({ doctor: doctor._id })
        .select("schedule holidays")
        .lean(),
      ReviewDoctor.aggregate([
        { $match: { doctor: doctor._id } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rate" },
            totalReviews: { $sum: 1 },
            ratingDistribution: { $push: "$rate" },
          },
        },
      ]),
    ]);

    const stats = reviewStats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: [],
    };

    const ratingDistribution = stats.ratingDistribution.reduce(
      (acc, rating) => {
        acc[rating] = (acc[rating] || 0) + 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        ...doctor,
        schedule: schedule?.schedule || [],
        holidays: schedule?.holidays || [],
        statistics: {
          averageRating: Number(stats.averageRating?.toFixed(1)) || 0,
          totalReviews: stats.totalReviews || 0,
          ratingDistribution,
        },
      },
    });
  } catch (error) {
    console.error("Get doctor detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin bác sĩ",
      error: error.message,
      data: {},
    });
  }
};

export const getAllDoctorsByAdmin = async (req, res) => {
  try {
    const admin = req.admin._id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const search = req.query.search || "";
    const specialty = req.query.specialty || "";
    const isActive = req.query.isActive;

    const clinic = await Clinic.findOne({ admin });
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    let filter = { clinic: clinic._id };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (specialty) {
      filter.specialty = { $regex: specialty, $options: "i" };
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Doctor.countDocuments(filter),
    ]);

    const doctorsWithStats = await Promise.all(
      doctors.map(async (doctor) => {
        const reviewStats = await ReviewDoctor.aggregate([
          { $match: { doctor: doctor._id } },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$rate" },
              totalReviews: { $sum: 1 },
            },
          },
        ]);

        const stats = reviewStats[0] || { averageRating: 0, totalReviews: 0 };

        return {
          ...doctor,
          statistics: {
            averageRating: Number(stats.averageRating?.toFixed(1)) || 0,
            totalReviews: stats.totalReviews || 0,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: doctorsWithStats,
      pagination: {
        page,
        pageSize,
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Get all doctors error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách bác sĩ",
      error: error.message,
      data: [],
    });
  }
};

export const getDoctorsByCustomer = async (req, res) => {
  try {
    const { search = "", specialty = "", clinic = "" } = req.query;
    let filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { specialty: { $regex: search, $options: "i" } },
      ];
    }

    if (specialty) {
      filter.specialty = specialty;
    }

    if (clinic) {
      filter.clinic = clinic;
    }

    if (req.query.page && req.query.pageSize) {
      const page = parseInt(req.query.page);
      const pageSize = parseInt(req.query.pageSize);

      const [doctors, total] = await Promise.all([
        Doctor.find(filter)
          .populate("clinic", "name")
          .sort({ experience: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize),
        Doctor.countDocuments(filter),
      ]);

      const doctorsWithRatings = await Promise.all(
        doctors.map(async (doctor) => {
          const reviews = await ReviewDoctor.aggregate([
            { $match: { doctor: doctor._id } },
            {
              $group: {
                _id: null,
                averageRating: { $avg: "$rate" },
                totalReviews: { $sum: 1 },
              },
            },
          ]);

          const rating = reviews[0] || { averageRating: 0, totalReviews: 0 };
          return {
            ...doctor.toObject(),
            rating: Number(rating.averageRating?.toFixed(1)) || 0,
            reviewCount: rating.totalReviews || 0,
          };
        })
      );

      const hasMore = page * pageSize < total;

      return res.status(200).json({
        success: true,
        data: {
          doctors: doctorsWithRatings,
          hasMore,
          total,
        },
      });
    } else {
      const doctors = await Doctor.find(filter)
        .populate("clinic", "name")
        .sort({ experience: -1 });

      const doctorsWithRatings = await Promise.all(
        doctors.map(async (doctor) => {
          const reviews = await ReviewDoctor.aggregate([
            { $match: { doctor: doctor._id } },
            {
              $group: {
                _id: null,
                averageRating: { $avg: "$rate" },
                totalReviews: { $sum: 1 },
              },
            },
          ]);

          const rating = reviews[0] || { averageRating: 0, totalReviews: 0 };
          return {
            ...doctor.toObject(),
            rating: Number(rating.averageRating?.toFixed(1)) || 0, // Formatted rating
            reviewCount: rating.totalReviews || 0, // Renamed to reviewCount
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: {
          doctors: doctorsWithRatings,
          total: doctors.length,
        },
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      data: [],
      error: error.message,
    });
  }
};
