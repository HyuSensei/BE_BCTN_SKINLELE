import Doctor from "../models/doctor.model.js";

export const createDoctor = async (req, res) => {
  try {
    const clinic = req.admin._id;
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
      isIndependent = false,
    } = req.body;

    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại, vui lòng thử lại !",
      });
    }

    const newDoctor = new Doctor({
      name,
      email,
      password,
      about,
      phone,
      fees,
      avatar,
      specialty,
      experience,
      isIndependent,
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
    const { name, email, password, about, phone, fees, avatar } = req.body;

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
          message: "Email đã tồn tại, vui lòng thử lại !",
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

    const updatedDoctor = await doctor.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin bác sĩ thành công",
      data: updatedDoctor,
    });
  } catch (error) {
    console.log(error);
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

    const doctor = await Doctor.findOne({ slug }).select("-password");
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ",
        data: {},
      });
    }

    return res.status(200).json({
      success: true,
      data: doctor,
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
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 12;
    const name = req.query.name;
    const skip = (page - 1) * pageSize;

    let filter = {};
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
