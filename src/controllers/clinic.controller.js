import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import ReviewClinic from "../models/review-clinic.model.js";

export const createClinic = async (req, res) => {
  try {
    const {
      specialties,
      name,
      logo,
      address,
      phone,
      email,
      description,
      images,
    } = req.body;
    const admin = req.admin._id;

    const existingClinic = await Clinic.findOne({ email });
    if (existingClinic) {
      return res.status(400).json({
        success: false,
        message: "Email phòng khám đã tồn tại trong hệ thống",
      });
    }

    const clinic = await Clinic.create({
      admin,
      specialties,
      name,
      logo,
      address,
      phone,
      email,
      description,
      images,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo mới phòng khám thành công",
      data: clinic,
    });
  } catch (error) {
    console.error("Create clinic error:", error);
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
    const updateData = req.body;

    const clinic = await Clinic.findById(id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    if (updateData.email && updateData.email !== clinic.email) {
      const existingClinic = await Clinic.findOne({ email: updateData.email });
      if (existingClinic) {
        return res.status(400).json({
          success: false,
          message: "Email phòng khám đã tồn tại trong hệ thống",
        });
      }
    }

    const updatedClinic = await Clinic.findByIdAndUpdate(
      id,
      { ...updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin phòng khám thành công",
      data: updatedClinic,
    });
  } catch (error) {
    console.error("Update clinic error:", error);
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
      Doctor.updateMany({ clinic: id }, { clinic: null }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Xóa phòng khám thành công",
    });
  } catch (error) {
    console.error("Remove clinic error:", error);
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
      city,
      isActive,
      sort = "createdAt",
    } = req.query;

    let filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }

    if (specialty) {
      filter.specialties = { $in: [specialty] };
    }

    if (city) {
      filter["address.city"] = city;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const [clinics, total] = await Promise.all([
      Clinic.find(filter)
        .populate("admin", "name email")
        .sort({ [sort]: sort === "name" ? 1 : -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Clinic.countDocuments(filter),
    ]);

    const clinicsWithExtra = await Promise.all(
      clinics.map(async (clinic) => {
        const [doctorCount, reviewCount, averageRating] = await Promise.all([
          Doctor.countDocuments({ clinic: clinic._id, isActive: true }),
          ReviewClinic.countDocuments({ clinic: clinic._id }),
          ReviewClinic.aggregate([
            { $match: { clinic: clinic._id } },
            { $group: { _id: null, avg: { $avg: "$rate" } } },
          ]),
        ]);

        return {
          ...clinic.toObject(),
          doctorCount,
          reviewCount,
          averageRating: averageRating[0]?.avg || 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: clinicsWithExtra,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize),
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
    const { id } = req.params;

    const clinic = await Clinic.findById(id).populate("admin", "name email");

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    const [doctors, reviews, averageRating] = await Promise.all([
      Doctor.find({ clinic: id, isActive: true })
        .select("-password")
        .sort({ createdAt: -1 }),
      ReviewClinic.find({ clinic: id })
        .populate("user", "name avatar")
        .sort({ createdAt: -1 })
        .limit(5),
      ReviewClinic.aggregate([
        { $match: { clinic: clinic._id } },
        { $group: { _id: null, avg: { $avg: "$rate" } } },
      ]),
    ]);

    const ratingStats = await ReviewClinic.aggregate([
      { $match: { clinic: clinic._id } },
      { $group: { _id: "$rate", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    const clinicDetail = {
      ...clinic.toObject(),
      doctors,
      reviews,
      statistics: {
        doctorCount: doctors.length,
        reviewCount: reviews.length,
        averageRating: averageRating[0]?.avg || 0,
        ratingDistribution: ratingStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
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
