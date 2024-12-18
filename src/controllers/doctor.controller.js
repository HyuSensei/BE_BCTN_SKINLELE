import { generateTimeSlots, getDayNumber } from "../helpers/schedule.js";
import Booking from "../models/booking.model.js";
import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";
import Schedule from "../models/schedule.model.js";
import moment from "moment";
import { formatPrice } from "../ultis/formatPrice.js";
import { Types } from "mongoose";
moment.tz.setDefault("Asia/Ho_Chi_Minh");

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
    const {
      page,
      pageSize,
      search = "",
      specialty = "",
      experience = "",
      priceRange = "",
      rating = "",
      clinic = "",
    } = req.query;

    let filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { specialty: { $regex: search, $options: "i" } },
        { about: { $regex: search, $options: "i" } },
      ];
    }

    if (specialty) {
      filter.specialty = specialty;
    }

    if (experience) {
      const [min, max] = experience.split("-").map(Number);
      if (max) {
        filter.experience = { $gte: min, $lte: max };
      } else {
        filter.experience = { $gte: min };
      }
    }

    if (priceRange) {
      const [min, max] = priceRange.split("-").map(Number);
      filter.fees = { $gte: min, $lte: max };
    }

    if (clinic) {
      filter.clinic = new Types.ObjectId(`${clinic}`);
    }

    const aggregationPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "reviewdoctors",
          localField: "_id",
          foreignField: "doctor",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: [
              { $gt: [{ $size: "$reviews" }, 0] },
              { $avg: "$reviews.rate" },
              0,
            ],
          },
          totalReviews: { $size: "$reviews" },
        },
      },
    ];

    if (rating) {
      aggregationPipeline.push({
        $match: {
          averageRating: { $gte: parseFloat(rating) },
        },
      });
    }

    aggregationPipeline.push({
      $lookup: {
        from: "clinics",
        localField: "clinic",
        foreignField: "_id",
        as: "clinicDetails",
      },
    });

    aggregationPipeline.push({
      $unwind: {
        path: "$clinicDetails",
        preserveNullAndEmptyArrays: true,
      },
    });

    aggregationPipeline.push({
      $project: {
        name: 1,
        slug: 1,
        specialty: 1,
        experience: 1,
        fees: 1,
        avatar: 1,
        about: 1,
        isActive: 1,
        rating: { $round: ["$averageRating", 1] },
        reviewCount: "$totalReviews",
        clinic: {
          _id: "$clinicDetails._id",
          name: "$clinicDetails.name",
          address: "$clinicDetails.address",
        },
      },
    });

    aggregationPipeline.push({ $sort: { experience: -1 } });

    const totalDocs = await Doctor.aggregate([
      ...aggregationPipeline,
      { $count: "total" },
    ]);
    const total = totalDocs[0]?.total || 0;

    let doctors = [];
    if (page && pageSize) {
      const currentPage = parseInt(page);
      const limit = parseInt(pageSize);
      const skip = (currentPage - 1) * limit;

      aggregationPipeline.push({ $skip: skip }, { $limit: limit });

      doctors = await Doctor.aggregate(aggregationPipeline);

      return res.status(200).json({
        success: true,
        data: {
          doctors,
          pagination: {
            page: currentPage,
            pageSize: limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          hasMore: skip + doctors.length < total,
        },
      });
    } else {
      doctors = await Doctor.aggregate(aggregationPipeline);

      return res.status(200).json({
        success: true,
        data: {
          doctors,
          total: doctors.length,
          hasMore: false,
        },
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách bác sĩ",
      error: error.message,
    });
  }
};

export const getScheduleByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const today = moment().startOf("day");
    const targetDate = req.query.date
      ? moment(req.query.date, "YYYY-MM-DD")
      : today;

    if (!targetDate.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Định dạng ngày không hợp lệ. Sử dụng format: YYYY-MM-DD",
      });
    }

    const doctor = await Doctor.findById(doctorId);
    const clinic = await Clinic.findOne({ _id: doctor.clinic });

    if (!doctor || !clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ hoặc phòng khám",
      });
    }

    const dayOfWeek = getDayNumber(targetDate);

    const workingHours = clinic.workingHours.find(
      (hours) => hours.dayOfWeek === dayOfWeek
    );

    if (!workingHours || !workingHours.isOpen) {
      return res.status(200).json({
        success: true,
        data: {
          date: targetDate.format("YYYY-MM-DD"),
          dayOfWeek,
          isOpen: false,
          timeSlots: [],
          message: `Phòng khám đóng cửa vào ngày ${targetDate} !`,
        },
      });
    }

    const isClinicHoliday = clinic.holidays.some((holiday) =>
      moment(holiday).isSame(targetDate, "day")
    );

    if (isClinicHoliday) {
      return res.status(200).json({
        success: true,
        data: {
          date: targetDate.format("YYYY-MM-DD"),
          dayOfWeek,
          isOpen: false,
          timeSlots: [],
          message: "Ngày nghỉ của phòng khám, xin lỗi quý khách hàng !",
        },
      });
    }

    const isDoctorHoliday = doctor.holidays.some((holiday) =>
      moment(holiday).isSame(targetDate, "day")
    );

    if (isDoctorHoliday) {
      return res.status(200).json({
        success: true,
        data: {
          date: targetDate.format("YYYY-MM-DD"),
          dayOfWeek,
          isOpen: false,
          timeSlots: [],
          message: "Ngày nghỉ của bác sĩ, xin lỗi quý khách hàng !",
        },
      });
    }

    const existingBookings = await Booking.find({
      doctor: doctorId,
      date: {
        $gte: targetDate.startOf("day").toDate(),
        $lte: targetDate.endOf("day").toDate(),
      },
      status: { $in: ["pending", "confirmed"] },
    });

    const timeSlots = generateTimeSlots({
      startTime: workingHours.startTime,
      endTime: workingHours.endTime,
      duration: doctor.duration || 30,
      breakTime: workingHours.breakTime,
      existingBookings,
      date: targetDate,
    });

    return res.status(200).json({
      success: true,
      data: {
        date: targetDate.format("YYYY-MM-DD"),
        dayOfWeek,
        isOpen: true,
        workingHours: {
          start: workingHours.startTime,
          end: workingHours.endTime,
          breakTime: workingHours.breakTime,
        },
        timeSlots,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      data: [],
      message: error.message,
    });
  }
};

export const getDoctorFilterOptions = async (req, res) => {
  try {
    const specialties = await Doctor.distinct("specialty");
    const experienceRanges = [
      { label: "Dưới 2 năm", value: "0-2", min: 0, max: 2 },
      { label: "2-5 năm", value: "2-5", min: 2, max: 5 },
      { label: "5-10 năm", value: "5-10", min: 5, max: 10 },
      { label: "Trên 10 năm", value: "10+", min: 10, max: null },
    ];

    const priceStats = await Doctor.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: null,
          minFee: { $min: "$fees" },
          maxFee: { $max: "$fees" },
        },
      },
    ]);

    let priceRanges = [];
    if (priceStats.length > 0) {
      const { minFee, maxFee } = priceStats[0];
      const min = Math.floor(minFee / 1000) * 1000;
      const max = Math.ceil(maxFee / 1000) * 1000;
      const range = max - min;
      const numRanges = range <= 500000 ? 2 : range <= 1000000 ? 3 : 4;
      const step = Math.ceil(range / numRanges / 10000) * 10000;

      for (let i = min; i < max; i += step) {
        const rangeMin = i;
        const rangeMax = Math.min(i + step, max);
        priceRanges.push({
          min: rangeMin,
          max: rangeMax,
          label: `${formatPrice(rangeMin, true)} - ${formatPrice(
            rangeMax,
            true
          )}`,
          value: `${rangeMin}-${rangeMax}`,
        });
      }
    }

    const ratingStats = await ReviewDoctor.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rate" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const ratingOptions = [
      { label: "Trên 4.5 ⭐", value: 4.5 },
      { label: "Trên 4.0 ⭐", value: 4.0 },
      { label: "Trên 3.5 ⭐", value: 3.5 },
    ];

    // 5. Get active clinics
    const clinics = await Clinic.find({ isActive: true })
      .select("name address")
      .limit(10);

    // 6. Status options
    const statusOptions = [
      { label: "Đang làm việc", value: true },
      { label: "Tạm nghỉ", value: false },
    ];

    // Get overall statistics
    const stats = await Doctor.aggregate([
      {
        $lookup: {
          from: "reviewdoctors",
          localField: "_id",
          foreignField: "doctor",
          as: "reviews",
        },
      },
      {
        $group: {
          _id: null,
          totalDoctors: { $sum: 1 },
          activeDoctors: { $sum: { $cond: ["$isActive", 1, 0] } },
          avgExperience: { $avg: "$experience" },
          avgRating: { $avg: { $avg: "$reviews.rate" } },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        specialties: {
          options: specialties.map((specialty) => ({
            label: specialty,
            value: specialty,
          })),
        },
        experience: {
          options: experienceRanges,
          stats: {
            avg: Math.round(stats[0]?.avgExperience || 0),
          },
        },
        prices: {
          ranges: priceRanges,
          stats: {
            min: priceStats[0]?.minFee || 0,
            max: priceStats[0]?.maxFee || 0,
            formatted: {
              min: formatPrice(priceStats[0]?.minFee || 0),
              max: formatPrice(priceStats[0]?.maxFee || 0),
            },
          },
        },
        ratings: {
          options: ratingOptions,
          stats: {
            average: Number((ratingStats[0]?.avgRating || 0).toFixed(1)),
            total: ratingStats[0]?.totalReviews || 0,
          },
        },
        clinics: {
          options: clinics.map((clinic) => ({
            label: clinic.name,
            value: clinic._id,
            address: clinic.address,
          })),
        },
        status: {
          options: statusOptions,
          stats: {
            total: stats[0]?.totalDoctors || 0,
            active: stats[0]?.activeDoctors || 0,
          },
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin filter",
      error: error.message,
    });
  }
};
