import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import ReviewClinic from "../models/review-clinic.model.js";
import { formatPrice } from "../ultis/formatPrice.js";

export const createClinic = async (req, res) => {
  try {
    const {
      specialties,
      name,
      logo,
      banners,
      address,
      phone,
      email,
      description,
      images,
      workingHours,
      holidays,
    } = req.body;
    const admin = req.admin._id;

    const existingClinic = await Clinic.findOne({
      $or: [
        { admin },
        { email },
        { name: { $regex: new RegExp(`^${name}$`, "i") } },
      ],
    });

    if (existingClinic) {
      return res.status(400).json({
        success: false,
        message:
          existingClinic.email === email
            ? "Email phòng khám đã tồn tại trong hệ thống"
            : "Tên phòng khám đã tồn tại trong hệ thống",
      });
    }

    if (workingHours) {
      for (const schedule of workingHours) {
        if (schedule.breakTime) {
          const { start, end } = schedule.breakTime;
          if (start && end) {
            const breakStart = moment(start, "HH:mm");
            const breakEnd = moment(end, "HH:mm");
            const dayStart = moment(schedule.startTime, "HH:mm");
            const dayEnd = moment(schedule.endTime, "HH:mm");

            if (
              breakStart >= breakEnd ||
              breakStart < dayStart ||
              breakEnd > dayEnd
            ) {
              return res.status(400).json({
                success: false,
                message: "Thời gian nghỉ không hợp lệ",
              });
            }
          }
        }
      }
    }

    const formattedHolidays = holidays
      ? holidays.map((date) => new Date(date))
      : [];

    const clinic = await Clinic.create({
      admin,
      specialties,
      name,
      logo,
      banners,
      address,
      phone,
      email,
      description,
      images,
      workingHours,
      holidays: formattedHolidays,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo mới phòng khám thành công",
      data: clinic,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo phòng khám",
      error: error.message,
    });
  }
};

export const updateClinic = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      address,
      description,
      specialties,
      logo,
      images,
      banners,
      workingHours,
      holidays,
      isActive,
    } = req.body;

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    if (email && email !== clinic.email) {
      const existingClinic = await Clinic.findOne({ email });
      if (existingClinic) {
        return res.status(400).json({
          success: false,
          message: "Email phòng khám đã tồn tại trong hệ thống",
        });
      }
    }

    if (name && name !== clinic.name) {
      const existingClinic = await Clinic.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
      });
      if (existingClinic) {
        return res.status(400).json({
          success: false,
          message: "Tên phòng khám đã tồn tại trong hệ thống",
        });
      }
    }

    if (workingHours) {
      for (const schedule of workingHours) {
        if (!schedule.dayOfWeek || !schedule.startTime || !schedule.endTime) {
          return res.status(400).json({
            success: false,
            message: "Thông tin giờ làm việc không hợp lệ",
          });
        }

        if (schedule.breakTime) {
          const { start, end } = schedule.breakTime;
          if (start && end) {
            const breakStart = moment(start, "HH:mm");
            const breakEnd = moment(end, "HH:mm");
            const dayStart = moment(schedule.startTime, "HH:mm");
            const dayEnd = moment(schedule.endTime, "HH:mm");

            if (
              breakStart >= breakEnd ||
              breakStart < dayStart ||
              breakEnd > dayEnd
            ) {
              return res.status(400).json({
                success: false,
                message: "Thời gian nghỉ không hợp lệ",
              });
            }
          }
        }
      }
    }

    const formattedHolidays = holidays
      ? holidays.map((date) => new Date(date))
      : clinic.holidays;

    const updateFields = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(description && { description }),
      ...(specialties && { specialties }),
      ...(logo && { logo }),
      ...(banners && { banners }),
      ...(images && { images }),
      ...(workingHours && { workingHours }),
      ...(holidays && { holidays: formattedHolidays }),
      ...(typeof isActive === "boolean" && { isActive }),
    };

    const updatedClinic = await Clinic.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin phòng khám thành công",
      data: updatedClinic,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin phòng khám",
      error: error.message,
    });
  }
};

export const removeClinic = async (req, res) => {
  try {
    const { id } = req.params;

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    const doctorCount = await Doctor.countDocuments({
      clinic: id,
      isActive: true,
    });

    if (doctorCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa phòng khám đang có bác sĩ hoạt động",
      });
    }

    await Promise.all([
      Clinic.findByIdAndDelete(id),
      ReviewClinic.deleteMany({ clinic: id }),
      Doctor.updateMany({ clinic: id }, { $set: { clinic: null } }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Xóa phòng khám thành công",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa phòng khám",
      error: error.message,
    });
  }
};

export const getAllClinic = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      search = "",
      specialty,
      sortBy = "createdAt",
      sortOrder = "desc",
      isActive,
    } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (specialty) {
      filter.specialties = { $in: [specialty] };
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortDirection };

    const [clinics, total] = await Promise.all([
      Clinic.find(filter)
        .populate("admin", "name email")
        .sort(sortOptions)
        .skip((page - 1) * pageSize)
        .limit(parseInt(pageSize)),
      Clinic.countDocuments(filter),
    ]);

    const clinicsWithStats = await Promise.all(
      clinics.map(async (clinic) => {
        const [doctorCount, reviewStats] = await Promise.all([
          Doctor.countDocuments({ clinic: clinic._id, isActive: true }),
          ReviewClinic.aggregate([
            { $match: { clinic: clinic._id } },
            {
              $group: {
                _id: null,
                averageRating: { $avg: "$rate" },
                totalReviews: { $sum: 1 },
              },
            },
          ]),
        ]);

        const stats = reviewStats[0] || { averageRating: 0, totalReviews: 0 };

        return {
          ...clinic.toObject(),
          statistics: {
            doctorCount,
            averageRating: Number(stats.averageRating?.toFixed(1)) || 0,
            totalReviews: stats.totalReviews || 0,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: clinicsWithStats,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPage: Math.ceil(total / pageSize),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Get all clinics error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách phòng khám",
      error: error.message,
    });
  }
};

export const getDetailClinic = async (req, res) => {
  try {
    const { slug } = req.params;

    const clinic = await Clinic.findOne({ slug, isActive: true })
      .select("-__v -createdAt -updatedAt")
      .populate("admin", "name email");

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    // Get clinic reviews stats
    const [reviewStats, doctorCount] = await Promise.all([
      ReviewClinic.aggregate([
        { $match: { clinic: clinic._id } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rate" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rate",
            },
          },
        },
      ]),
      Doctor.countDocuments({ clinic: clinic._id, isActive: true }),
    ]);

    const stats = reviewStats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: [],
    };

    // Calculate rating distribution
    const ratingDistribution = stats.ratingDistribution.reduce(
      (acc, rating) => {
        acc[rating] = (acc[rating] || 0) + 1;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    );

    const clinicDetail = {
      ...clinic.toObject(),
      statistics: {
        doctorCount,
        reviewCount: stats.totalReviews,
        averageRating: Number(stats.averageRating?.toFixed(1)) || 0,
        ratingDistribution,
      },
    };

    return res.status(200).json({
      success: true,
      data: clinicDetail,
    });
  } catch (error) {
    console.error("Get clinic detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết phòng khám",
      error: error.message,
    });
  }
};

export const getCliniDetailByAdmin = async (req, res) => {
  try {
    const admin = req.admin._id;
    const clinic = await Clinic.findOne({ admin }).populate(
      "admin",
      "name email"
    );

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    const [doctors, reviews, reviewStats] = await Promise.all([
      Doctor.find({ clinic: clinic._id, isActive: true })
        .select("-password")
        .sort({ createdAt: -1 }),
      ReviewClinic.find({ clinic: clinic._id })
        .populate("user", "name avatar")
        .sort({ createdAt: -1 })
        .limit(5),
      ReviewClinic.aggregate([
        { $match: { clinic: clinic._id } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rate" },
            totalReviews: { $sum: 1 },
            ratingDistribution: {
              $push: "$rate",
            },
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
      {}
    );

    const clinicDetail = {
      ...clinic.toObject(),
      doctors,
      reviews,
      statistics: {
        doctorCount: doctors.length,
        averageRating: Number(stats.averageRating?.toFixed(1)) || 0,
        totalReviews: stats.totalReviews || 0,
        ratingDistribution,
      },
    };

    return res.status(200).json({
      success: true,
      data: clinicDetail,
    });
  } catch (error) {
    console.error("Get clinic detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết phòng khám",
      error: error.message,
    });
  }
};

export const updateClinicByOwner = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const {
      name,
      email,
      phone,
      address,
      description,
      specialties,
      logo,
      images,
      banners,
      workingHours,
      holidays,
    } = req.body;
    
    const clinic = await Clinic.findOne({ admin: adminId });
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    if (email && email !== clinic.email) {
      const existingClinic = await Clinic.findOne({ email });
      if (existingClinic) {
        return res.status(400).json({
          success: false,
          message: "Email phòng khám đã tồn tại trong hệ thống",
        });
      }
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;
    if (description) updateFields.description = description;
    if (specialties) updateFields.specialties = specialties;
    if (logo) updateFields.logo = logo;
    if (images) updateFields.images = images;
    if (banners) updateFields.banners = banners;
    if (workingHours) updateFields.workingHours = workingHours;
    if (holidays) updateFields.holidays = holidays;
 
    const updatedClinic = await Clinic.findOneAndUpdate(
      { admin: adminId },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedClinic) {
      return res.status(500).json({
        success: false,
        message: "Cập nhật phòng khám thất bại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật phòng khám thành công",
      data: updatedClinic,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật phòng khám",
    });
  }
};

export const getClinicsByCustomer = async (req, res) => {
  try {
    const { search = "", specialty = "" } = req.query;
    let filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    if (specialty) {
      filter.specialties = { $in: [specialty] };
    }

    // If page & pageSize provided, do pagination
    if (req.query.page && req.query.pageSize) {
      const page = parseInt(req.query.page);
      const pageSize = parseInt(req.query.pageSize);

      const [clinics, total] = await Promise.all([
        Clinic.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
        Clinic.countDocuments(filter),
      ]);

      const hasMore = page * pageSize < total;

      return res.status(200).json({
        success: true,
        data: {
          clinics,
          hasMore,
          total,
        },
      });

      // Otherwise return all results
    } else {
      const clinics = await Clinic.find(filter).sort({ createdAt: -1 }).lean();

      return res.status(200).json({
        success: true,
        data: {
          clinics,
          total: clinics.length,
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

export const getClinicFilterOptions = async (req, res) => {
  try {
    const doctorPrices = await Doctor.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$fees" },
          maxPrice: { $max: "$fees" }
        }
      }
    ]);

    const prices = doctorPrices[0] || { minPrice: 0, maxPrice: 0 };
    let priceRanges = [];

    if (prices.maxPrice > 0) {
      const min = Math.floor(prices.minPrice / 1000) * 1000;
      const max = Math.ceil(prices.maxPrice / 1000) * 1000;
      const range = max - min;
      const numRanges = range <= 500000 ? 2 : range <= 1000000 ? 3 : 4;
      const step = Math.ceil(range / numRanges / 10000) * 10000;

      for (let i = min; i < max; i += step) {
        const rangeMin = i;
        const rangeMax = Math.min(i + step, max);
        priceRanges.push({
          min: rangeMin,
          max: rangeMax,
          label: `${formatPrice(rangeMin, true)} - ${formatPrice(rangeMax, true)}`,
          value: `${rangeMin}-${rangeMax}`
        });
      }
    }

    const doctorCountRanges = await Clinic.aggregate([
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: 'clinic',
          as: 'doctors'
        }
      },
      {
        $group: {
          _id: null,
          counts: { $push: { $size: '$doctors' } }
        }
      },
      {
        $project: {
          _id: 0,
          min: { $min: '$counts' },
          max: { $max: '$counts' }
        }
      }
    ]);

    const doctorCounts = doctorCountRanges[0] || { min: 0, max: 0 };
    const doctorCountOptions = [
      { label: '1-5 bác sĩ', value: '1-5', min: 1, max: 5 },
      { label: '6-10 bác sĩ', value: '6-10', min: 6, max: 10 },
      { label: '11-20 bác sĩ', value: '11-20', min: 11, max: 20 },
      { label: 'Trên 20 bác sĩ', value: '20+', min: 20, max: null }
    ];

    const ratingStats = await ReviewClinic.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rate' },
          ratings: { $push: '$rate' }
        }
      }
    ]);

    const ratingOptions = [
      { label: 'Trên 4.5 ⭐', value: '4.5', min: 4.5 },
      { label: 'Trên 4.0 ⭐', value: '4.0', min: 4.0 },
      { label: 'Trên 3.5 ⭐', value: '3.5', min: 3.5 },
      { label: 'Trên 3.0 ⭐', value: '3.0', min: 3.0 }
    ];

    const workingHourOptions = [
      { label: 'Sáng (06:00 - 12:00)', value: 'morning', start: '06:00', end: '12:00' },
      { label: 'Chiều (12:00 - 18:00)', value: 'afternoon', start: '12:00', end: '18:00' },
      { label: 'Tối (18:00 - 22:00)', value: 'evening', start: '18:00', end: '22:00' },
      { label: 'Cả ngày', value: 'allday' }
    ];

    const statusOptions = [
      { label: 'Đang hoạt động', value: true },
      { label: 'Tạm ngừng', value: false }
    ];

    const clinicStats = await Clinic.aggregate([
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: 'clinic',
          as: 'doctors'
        }
      },
      {
        $lookup: {
          from: 'reviewclinics',
          localField: '_id',
          foreignField: 'clinic',
          as: 'reviews'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          inactiveCount: {
            $sum: { $cond: ['$isActive', 0, 1] }
          },
          avgRating: { $avg: { $avg: '$reviews.rate' } }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        prices: {
          ranges: priceRanges,
          stats: {
            min: prices.minPrice,
            max: prices.maxPrice,
            formatted: {
              min: formatPrice(prices.minPrice),
              max: formatPrice(prices.maxPrice)
            }
          }
        },
        doctorCounts: {
          options: doctorCountOptions,
          stats: doctorCounts
        },
        ratings: {
          options: ratingOptions,
          stats: ratingStats[0] || { averageRating: 0 }
        },
        workingHours: workingHourOptions,
        status: {
          options: statusOptions,
          stats: clinicStats[0] || {
            total: 0,
            activeCount: 0,
            inactiveCount: 0
          }
        }
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin filter",
      error: error.message
    });
  }
};
