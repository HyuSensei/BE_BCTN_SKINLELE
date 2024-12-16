import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Otp from "../models/otp.model.js";
import { generateOTP } from "../ultis/generateOTP.js";
import { sendEmail } from "../configs/mail.js";
import Admin from "../models/admin.model.js";
import Doctor from "../models/doctor.model.js";
import Clinic from "../models/clinic.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";
import Schedule from "../models/schedule.model.js";

const generateTokenDoctor = (doctor) => {
  return jwt.sign(
    { id: doctor._id, email: doctor.email },
    process.env.JWT_SECRET_KEY_DOCTOR,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET_KEY_USER,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const generateTokenAdmin = (admin) => {
  return jwt.sign(
    { id: admin._id, username: admin.username, role: admin.role },
    process.env.JWT_SECRET_KEY_ADMIN,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const handleLoginResponse = (user, token) => {
  return {
    success: true,
    accessToken: token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
    },
  };
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({
        success: false,
        message: "Thông tin đăng nhập không chính xác",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng xác thực tài khoản",
        data: {
          verify: false,
          email,
        },
      });
    }

    const token = generateToken(user);
    return res.status(200).json(handleLoginResponse(user, token));
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Có lỗi xảy ra khi đăng nhập",
    });
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email đăng ký đã tồn tại",
      });
    }
    const newUser = new User({
      name,
      email,
      password,
      avatar: {
        url: `https://avatar.iran.liara.run/username?username=${name}`,
        publicId: "",
      },
    });
    const otp = generateOTP();
    const expirationTime = Date.now() + 5 * 60 * 1000;
    const newOtp = new Otp({
      email,
      otp,
      exp: Math.floor(expirationTime / 1000),
    });
    await Promise.all([newUser.save(), newOtp.save()]);
    sendEmail({ name: newUser.name, email, verificationCode: otp });
    res.status(201).json({
      success: true,
      message:
        "Đăng ký tài khoản thành công. Vui lòng kiểm tra email để xác thực OTP.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Có lỗi xảy ra khi đăng ký tài khoản",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã OTP",
      });
    }

    const otpRecord = await Otp.findOne({
      email,
      otp: parseInt(otp),
    });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không hợp lệ",
      });
    }
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > otpRecord.exp) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP đã hết hạn",
      });
    }
    await Promise.all([
      User.findOneAndUpdate({ email }, { isActive: true }),
      Otp.deleteOne({ _id: otpRecord._id }),
    ]);
    return res.status(200).json({
      success: true,
      message: "Xác thực OTP thành công",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Có lỗi xảy ra khi xác thực",
    });
  }
};

export const getAccountUser = async (req, res) => {
  try {
    const userDetails = await User.findById(req.user._id).select(
      "-password -__v"
    );
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "Vui lòng đăng nhập",
      });
    }
    return res.status(200).json({
      success: true,
      data: userDetails,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      data: {},
      message: "Lỗi server: " + error.message,
    });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống",
      });
    }
    await Otp.deleteMany({ email });
    const otp = generateOTP();
    const expirationTime = Date.now() + 5 * 60 * 1000;
    const newOtp = new Otp({
      email,
      otp,
      exp: Math.floor(expirationTime / 1000),
    });
    await newOtp.save();
    sendEmail({ name: user.name, email, verificationCode: otp });
    res.status(200).json({
      success: true,
      message: "OTP đã được gửi tới email",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Có lỗi xảy ra khi yêu cầu mã OTP",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      email,
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Thông tin người dùng không tồn tại",
      });
    }
    user.password = password;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Có lỗi xảy ra khi tạo mật khẩu",
    });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    const user = await User.findOne({
      email,
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Thông tin người dùng không tồn tại",
      });
    }

    user.name = name || user.name;
    user.password = password || user.password;
    user.avatar.url = avatar?.url || user.avatar.url;
    user.avatar.publicId = avatar?.publicId || user.avatar.publicId;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ thành công",
      data: user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Có lỗi xảy ra khi cập nhật hồ sơ",
    });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(400).json({
        success: false,
        message: "Thông tin đăng nhập không chính xác",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa",
      });
    }

    let clinic = null;
    if (admin.role === "CLINIC") {
      clinic = await Clinic.findOne({ admin: admin._id }).select(
        "-__v -createdAt -updatedAt"
      );
    }

    const token = generateTokenAdmin(admin);
    return res.status(200).json({
      success: true,
      accessToken: token,
      data: {
        _id: admin._id,
        name: admin.name,
        username: admin.username,
        avatar: admin.avatar,
        role: admin.role,
        clinic,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi đăng nhập admin",
      error: error.message,
    });
  }
};

export const getAccountAdmin = async (req, res) => {
  try {
    const adminDetails = await Admin.findById(req.admin._id).select(
      "-password -__v"
    );

    if (!adminDetails) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin tài khoản admin",
      });
    }

    if (!adminDetails.isActive) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản admin đã bị vô hiệu hóa",
      });
    }

    let clinic = null;
    if (adminDetails.role === "CLINIC") {
      clinic = await Clinic.findOne({ admin: adminDetails._id }).select(
        "-__v -createdAt -updatedAt"
      );
    }
    return res.status(200).json({
      success: true,
      data: {
        _id: adminDetails._id,
        name: adminDetails.name,
        username: adminDetails.username,
        avatar: adminDetails.avatar,
        role: adminDetails.role,
        clinic: clinic || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      data: {},
    });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const accessToken = generateToken(req.user);
    return res.redirect(`${process.env.FRONT_END_URL}?token=${accessToken}`);
  } catch (error) {
    return res.redirect(`${process.env.FRONT_END_URL}/auth?error=server_error`);
  }
};

export const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await Doctor.findOne({ email });

    if (!doctor || !(await bcrypt.compare(password, doctor.password))) {
      return res.status(400).json({
        success: false,
        message: "Thông tin đăng nhập không chính xác",
      });
    }

    if (!doctor.isActive) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không hoạt động vui lòng thử lại",
      });
    }

    const token = generateTokenDoctor(doctor);
    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        accessToken: token,
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        avatar: doctor.avatar,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: "Có lỗi xảy ra khi đăng nhập",
    });
  }
};

export const getAccountDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user._id)
      .select("-password -__v")
      .populate({
        path: "clinic",
        select:
          "name logo address email phone description specialties workingHours holidays",
      });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin tài khoản bác sĩ",
      });
    }

    if (!doctor.isActive) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản bác sĩ đã bị vô hiệu hóa",
      });
    }

    const resSchedule = await Schedule.findOne({ doctor: doctor._id }).select(
      "schedule holidays"
    );

    return res.status(200).json({
      success: true,
      data: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        avatar: doctor.avatar,
        phone: doctor.phone,
        specialty: doctor.specialty,
        experience: doctor.experience,
        fees: doctor.fees,
        about: doctor.about,
        duration: doctor.duration,
        clinic: doctor.clinic,
        schedule: resSchedule?.schedule || [],
        holidays: doctor?.holidays || [],
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      data: {},
      message: error.message,
    });
  }
};
