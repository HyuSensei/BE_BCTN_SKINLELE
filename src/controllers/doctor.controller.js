import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";
import bcrypt from "bcryptjs";

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
    } = req.body;

    const clinic = await Clinic.findOne({ admin });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám !",
      });
    }

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại, vui lòng thử lại !",
      });
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
    });

    const savedDoctor = await newDoctor.save();

    return res.status(201).json({
      success: true,
      message: "Tạo mới thông tin bác sĩ thành công",
      data: savedDoctor,
    });
  } catch (error) {
    console.log(error);
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
      newPassword,
      about,
      phone,
      fees,
      avatar,
      specialty,
      experience,
      isActive,
    } = req.body;

    // Find doctor and validate existence
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ",
      });
    }

    // Validate email uniqueness
    if (email && email !== doctor.email) {
      const existingDoctor = await Doctor.findOne({ email });
      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          message: "Email đã tồn tại, vui lòng thử lại!",
        });
      }
    }

    // Handle password update
    if (newPassword) {
      // Verify old password if provided
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập mật khẩu hiện tại",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, doctor.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Mật khẩu hiện tại không đúng",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      doctor.password = hashedPassword;
    }

    // Update basic fields
    const updateFields = {
      name,
      email,
      about,
      phone,
      fees,
      avatar,
      specialty,
      experience,
      isActive,
    };

    // Only update fields that are provided
    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] !== undefined) {
        doctor[key] = updateFields[key];
      }
    });

    const updatedDoctor = await doctor.save();

    // Remove password from response
    const doctorResponse = updatedDoctor.toObject();
    delete doctorResponse.password;

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin bác sĩ thành công",
      data: doctorResponse,
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

    await Doctor.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa thông tin bác sĩ thành công",
    });
  } catch (error) {
    console.log(error);
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

    const doctor = await Doctor.findOne({ slug })
      .select("-__v -createdAt -updatedAt -password")
      .populate("clinic")
      .lean();

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ",
        data: {},
      });
    }

    const reviewStats = await ReviewDoctor.aggregate([
      {
        $match: { doctor: doctor._id },
      },
      {
        $group: {
          _id: null,
          rating: { $avg: "$rate" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const stats = reviewStats[0] || { rating: 0, totalReviews: 0 };

    const doctorWithStats = {
      ...doctor,
      rating: Number(stats.rating?.toFixed(1)) || 0,
      totalReviews: stats.totalReviews,
    };

    return res.status(200).json({
      success: true,
      data: doctorWithStats,
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

export const getAllDoctorByAdmin = async (req, res) => {
  try {
    const admin = req.admin._id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const name = req.query.name;
    const skip = (page - 1) * pageSize;

    const clinic = await Clinic.findOne({ admin });
    if (!clinic) throw new Error("Không tìm thấy thông tin phong khám");

    let filter = { clinic: clinic._id };
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Doctor.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: doctors,
      pagination: {
        page,
        totalPage: Math.ceil(total / pageSize),
        pageSize,
        totalItems: total,
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
