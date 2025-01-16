import mongoose from "mongoose";
import { convertToVietnameseDay } from "../helpers/convert.js";
import Booking from "../models/booking.model.js";
import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import ReviewDoctor from "../models/review-doctor.model.js";
import moment from "moment";
moment.tz.setDefault("Asia/Ho_Chi_Minh");

export const createBooking = async (req, res) => {
  try {
    const { clinic, doctor, date, startTime, endTime, customer, price, note } =
      req.body;
    const user = req.user._id;

    if (
      !clinic ||
      !doctor ||
      !date ||
      !startTime ||
      !endTime ||
      !customer ||
      !price
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin đặt lịch",
      });
    }

    const [clinicExists, doctorExists] = await Promise.all([
      Clinic.findOne({ _id: clinic, isActive: true }),
      Doctor.findOne({ _id: doctor, clinic: clinic, isActive: true }),
    ]);

    if (!clinicExists || !clinicExists.isActive) {
      return res.status(400).json({
        success: false,
        message: "Phòng khám không tồn tại hoặc đã ngừng hoạt động",
      });
    }

    if (!doctorExists) {
      return res.status(400).json({
        success: false,
        message: "Bác sĩ không tồn tại hoặc không thuộc phòng khám này",
      });
    }

    const bookingDate = moment(date).startOf("day");
    const today = moment().startOf("day");

    if (!bookingDate.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Ngày đặt lịch không hợp lệ",
      });
    }

    if (bookingDate.isBefore(today)) {
      return res.status(400).json({
        success: false,
        message: "Không thể đặt lịch cho ngày trong quá khứ",
      });
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: "Định dạng thời gian không hợp lệ (HH:mm)",
      });
    }

    const startMoment = moment(startTime, "HH:mm");
    const endMoment = moment(endTime, "HH:mm");

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Thời gian không hợp lệ",
      });
    }

    if (endMoment.isSameOrBefore(startMoment)) {
      return res.status(400).json({
        success: false,
        message: "Thời gian kết thúc phải sau thời gian bắt đầu",
      });
    }

    const isClinicHoliday = clinicExists.holidays.some((holiday) =>
      moment(holiday).isSame(bookingDate, "day")
    );

    if (isClinicHoliday) {
      return res.status(400).json({
        success: false,
        message: "Phòng khám không làm việc vào ngày này (ngày nghỉ)",
      });
    }

    const isDoctorHoliday = doctorExists.holidays.some((holiday) =>
      moment(holiday).isSame(bookingDate, "day")
    );

    if (isDoctorHoliday) {
      return res.status(400).json({
        success: false,
        message: "Bác sĩ không làm việc vào ngày này (ngày nghỉ)",
      });
    }

    const dayOfWeek = convertToVietnameseDay(bookingDate);
    const workingHours = clinicExists.workingHours.find(
      (hours) => hours.dayOfWeek === dayOfWeek && hours.isOpen
    );

    if (!workingHours) {
      return res.status(400).json({
        success: false,
        message: `Phòng khám không làm việc vào ${dayOfWeek}`,
      });
    }

    const clinicStart = moment(workingHours.startTime, "HH:mm");
    const clinicEnd = moment(workingHours.endTime, "HH:mm");

    if (startMoment.isBefore(clinicStart) || endMoment.isAfter(clinicEnd)) {
      return res.status(400).json({
        success: false,
        message: `Thời gian đặt lịch phải nằm trong khung giờ làm việc (${workingHours.startTime} - ${workingHours.endTime})`,
      });
    }

    if (workingHours.breakTime) {
      const breakStart = moment(workingHours.breakTime.start, "HH:mm");
      const breakEnd = moment(workingHours.breakTime.end, "HH:mm");

      if (
        startMoment.isBetween(breakStart, breakEnd, undefined, "[]") ||
        endMoment.isBetween(breakStart, breakEnd, undefined, "[]")
      ) {
        return res.status(400).json({
          success: false,
          message: `Thời gian đặt lịch trùng với giờ nghỉ trưa (${workingHours.breakTime.start} - ${workingHours.breakTime.end})`,
        });
      }
    }

    const existingBooking = await Booking.findOne({
      doctor,
      date: bookingDate.toDate(),
      $or: [
        {
          startTime: startTime,
          status: { $in: ["pending", "confirmed"] },
        },
        {
          endTime: endTime,
          status: { $in: ["pending", "confirmed"] },
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gt: startTime } },
            { status: { $in: ["pending", "confirmed"] } },
          ],
        },
      ],
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "Thời gian này đã có lịch hẹn, vui lòng chọn thời gian khác",
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Giá tiền không hợp lệ",
      });
    }

    const booking = await Booking.create({
      user,
      doctor,
      clinic,
      date: bookingDate.toDate(),
      startTime,
      endTime,
      customer,
      price,
      note: note || "",
      statusHistory: [
        {
          status: "pending",
          updatedBy: user,
          updatedByModel: "User",
          date: new Date(),
        },
      ],
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("doctor", "name email phone avatar specialty")
      .populate("clinic", "name logo address");

    return res.status(201).json({
      success: true,
      message: "Đặt lịch khám thành công",
      data: populatedBooking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
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
    const validModels = ["User", "Doctor"];

    if (!validModels.includes(model)) {
      return res.status(400).json({
        success: false,
        message: "Loại người dùng cập nhật không hợp lệ",
      });
    }

    if (model === "User") {
      if (!["cancelled", "completed"].includes(status)) {
        return res.status(403).json({
          success: false,
          message:
            "Người dùng chỉ có thể hủy hoặc xác nhận hoàn thành lịch khám",
        });
      }

      if (status === "cancelled" && booking.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Chỉ có thể hủy lịch khám đang chờ xác nhận",
        });
      }

      if (status === "completed" && booking.status !== "confirmed") {
        return res.status(400).json({
          success: false,
          message: "Chỉ có thể xác nhận hoàn thành lịch khám đã được duyệt",
        });
      }
    }

    if (status === "cancelled") {
      if (!cancelReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp lý do hủy lịch khám",
        });
      }
      booking.cancelReason = cancelReason.trim();
    } else {
      booking.cancelReason = "";
    }

    booking.status = status;
    booking.statusHistory.push({
      prevStatus,
      status,
      updatedBy,
      updatedByModel: model,
      date: new Date(),
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
    const user = req.user;
    const booking = await Booking.findOne({
      _id: id,
      user: user._id,
    })
      .populate("user", "name email")
      .populate("doctor", "name email phone avatar specialty slug")
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
    const {
      page = 1,
      pageSize = 10,
      status,
      fromDate,
      toDate,
      search,
      bookingId,
    } = req.query;
    const doctorId = req.user._id;

    let filter = { doctor: doctorId };

    if (bookingId) {
      filter._id = new mongoose.Types.ObjectId(`${bookingId}`);
    }

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Add date range filter if provided
    if (fromDate && toDate) {
      filter.date = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    // Add search filter if provided
    if (search) {
      filter.$or = [
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("user", "name email")
        .sort({ date: -1, startTime: -1 }) // Sort by newest first
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPage: Math.ceil(total / parseInt(pageSize)),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách đặt lịch",
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

    const [bookings, total, statusCounts, reviewedBookings] = await Promise.all(
      [
        Booking.find(filter)
          .populate("doctor", "name email phone avatar specialty")
          .populate("clinic", "name logo address")
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize),
        Booking.countDocuments(filter),
        Booking.aggregate([
          { $match: { user: userId } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        ReviewDoctor.find({ user: userId }).distinct("booking"),
      ]
    );
    const bookingsWithReviewStatus = bookings.map((booking) => ({
      ...booking.toObject(),
      isReview: reviewedBookings.some((id) => id?.equals(booking._id)),
    }));

    const currentPage = parseInt(page);
    const currentPageSize = parseInt(pageSize);
    const totalPages = Math.ceil(total / currentPageSize);
    const hasMore = currentPage < totalPages;

    const statusCountsObject = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      statusCountsObject[item._id] = item.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        bookings: bookingsWithReviewStatus,
        pagination: {
          page: currentPage,
          pageSize: currentPageSize,
          totalPages,
          totalItems: total,
        },
        hasMore,
        remainingItems: Math.max(0, total - currentPage * currentPageSize),
        statistics: {
          total,
          ...statusCountsObject,
        },
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
    const {
      page = 1,
      pageSize = 10,
      status,
      fromDate,
      toDate,
      search,
    } = req.query;
    const admin = req.admin._id;

    const clinic = await Clinic.findOne({ admin });
    if (!clinic) throw new Error("Không tìm thấy thông tin phòng khám");

    let filter = { clinic: clinic._id };

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.date = {};

      if (fromDate) {
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        filter.date.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }

    if (search) {
      filter.$or = [
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
        { "customer.phone": { $regex: search, $options: "i" } },
      ];
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("user", "name email")
        .populate("doctor", "name avatar email phone specialty")
        .sort({ date: -1, startTime: -1 })
        .skip((page - 1) * pageSize)
        .limit(parseInt(pageSize)),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPage: Math.ceil(total / pageSize),
          totalItems: total,
        },
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

export const updateBookingInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer } = req.body;
    const user = req.user._id;

    const booking = await Booking.findOne({
      _id: id,
      user,
      status: "pending",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch khám hoặc không có quyền cập nhật",
      });
    }

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Thông tin khách hàng không hợp lệ",
      });
    }

    const { name, phone, email, dateOfBirth, gender, address } = customer;

    booking.customer = {
      name: name || booking.customer.name,
      phone: phone || booking.customer.phone,
      email: email || booking.customer.email,
      dateOfBirth: dateOfBirth || booking.customer.dateOfBirth,
      gender: gender || booking.customer.gender,
      address: address || booking.customer.address,
    };

    const updatedBooking = await booking.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin lịch khám thành công",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking info error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin lịch khám",
      error: error.message,
    });
  }
};
