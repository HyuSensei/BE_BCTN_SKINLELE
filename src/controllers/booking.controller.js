import Booking from "../models/booking.model.js";
import Clinic from "../models/clinic.model.js";

export const createBooking = async (req, res) => {
  try {
    const { clinic, doctor, date, startTime, endTime, customer, price, note } =
      req.body;
    const user = req.user._id;

    const existingBooking = await Booking.findOne({
      doctor,
      clinic,
      date,
      startTime,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Lịch khám này đã được đặt",
      });
    }

    const booking = await Booking.create({
      user,
      doctor,
      clinic,
      date: new Date(date),
      startTime,
      endTime,
      customer,
      price,
      note,
      statusHistory: [
        {
          status: "pending",
          updatedBy: user,
          updatedByModel: "User",
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Đặt lịch khám thành công",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tạo lịch khám",
      error: error.message,
    });
  }
};

export const updateStatusBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancelReason, model } = req.body;
    const updatedBy = req.user._id;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch khám",
      });
    }

    const prevStatus = booking.status;
    booking.status = status;

    if (status === "cancelled" && cancelReason) {
      booking.cancelReason = cancelReason;
    }

    booking.statusHistory.push({
      prevStatus,
      status,
      updatedBy,
      updatedByModel: model,
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái lịch khám thành công",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái",
      error: error.message,
    });
  }
};

export const removeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch khám",
      });
    }

    if (!["pending", "cancelled"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể xóa lịch khám đang chờ hoặc đã hủy",
      });
    }

    await Booking.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa lịch khám thành công",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xóa lịch khám",
      error: error.message,
    });
  }
};

export const getBookingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("user", "name email")
      .populate("doctor", "name email phone")
      .populate("clinic", "name logo address slug");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch khám",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết lịch khám",
      error: error.message,
    });
  }
};

export const getAllBookingByDoctor = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, date, search } = req.query;
    const { doctorId } = req.params;

    let filter = { doctor: doctorId };

    if (status) {
      filter.status = status;
    }

    if (date) {
      filter.date = new Date(date);
    }

    if (search) {
      filter["$or"] = [
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("user", "name email")
        .sort({ date: 1, startTime: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      data: [],
    });
  }
};

export const getAllBookingByCustomer = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const userId = req.user._id;

    let filter = { user: userId };

    if (status) {
      filter.status = status;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("doctor", "name email phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      data: [],
    });
  }
};

export const getAllBookingByAdmin = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, date, search } = req.query;
    const admin = req.admin._id;

    const clinic = await Clinic.findOne({ admin });
    if (!clinic) throw new Error("Không tìm thấy thông tin phòng khám");

    let filter = { clinic: clinic._id };

    if (status) {
      filter.status = status;
    }

    if (date) {
      filter.date = new Date(date);
    }

    if (search) {
      filter["$or"] = [
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("user", "name email")
        .sort({ date: 1, startTime: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize),
        totalItems: total,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      data: [],
    });
  }
};
