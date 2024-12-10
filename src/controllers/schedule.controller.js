import Schedule from "../models/schedule.model.js";
import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import Booking from "../models/booking.model.js";
import moment from "moment";
import { convertToVietnameseDay } from "../helpers/convert.js";
import {
  generateAvailableTimeSlots,
  getDayNumber,
} from "../helpers/schedule.js";

export const createSchedule = async (req, res) => {
  try {
    const { doctor, clinic, schedule, holidays } = req.body;

    const doctorExists = await Doctor.findOne({
      _id: doctor,
      clinic,
      isActive: true,
    });

    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin bác sĩ hoặc không thuộc phòng khám",
      });
    }

    const clinicData = await Clinic.findById(clinic);
    if (!clinicData) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin phòng khám",
      });
    }

    // Validate schedule against clinic hours
    for (const slot of schedule) {
      const clinicHours = clinicData.workingHours.find(
        (h) => h.dayOfWeek === slot.dayOfWeek
      );

      if (!clinicHours.isOpen) {
        return res.status(400).json({
          success: false,
          message: `Phòng khám đóng cửa vào ${slot.dayOfWeek}`,
        });
      }

      const slotStart = moment(slot.startTime, "HH:mm");
      const slotEnd = moment(slot.endTime, "HH:mm");
      const clinicStart = moment(clinicHours.startTime, "HH:mm");
      const clinicEnd = moment(clinicHours.endTime, "HH:mm");

      if (slotStart < clinicStart || slotEnd > clinicEnd) {
        return res.status(400).json({
          success: false,
          message: `Thời gian làm việc phải nằm trong khung giờ phòng khám (${clinicHours.startTime} - ${clinicHours.endTime})`,
        });
      }
    }

    const existSchedule = await Schedule.findOne({ doctor });
    if (existSchedule) {
      return res.status(400).json({
        success: false,
        message: "Lịch làm việc đã được tạo trước đó",
      });
    }

    // Validate and format holidays
    const formattedHolidays = holidays
      ? holidays.map((date) => new Date(date))
      : [];

    const newSchedule = await Schedule.create({
      doctor,
      clinic,
      schedule: schedule.map((slot) => ({
        ...slot,
        duration: slot.duration || 15,
      })),
      holidays: formattedHolidays,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo lịch làm việc thành công",
      data: newSchedule,
    });
  } catch (error) {
    console.error("Create schedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tạo lịch làm việc",
      error: error.message,
    });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { schedule, holidays } = req.body;
    const updateFields = {};

    const existingSchedule = await Schedule.findOne({ doctor: id }).populate(
      "clinic",
      "workingHours"
    );

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

    if (schedule) {
      for (const slot of schedule) {
        const clinicHours = existingSchedule.clinic.workingHours.find(
          (h) => h.dayOfWeek === slot.dayOfWeek
        );

        if (!clinicHours.isOpen) {
          return res.status(400).json({
            success: false,
            message: `Phòng khám đóng cửa vào ${slot.dayOfWeek}`,
          });
        }

        const slotStart = moment(slot.startTime, "HH:mm");
        const slotEnd = moment(slot.endTime, "HH:mm");
        const clinicStart = moment(clinicHours.startTime, "HH:mm");
        const clinicEnd = moment(clinicHours.endTime, "HH:mm");

        if (slotStart < clinicStart || slotEnd > clinicEnd) {
          return res.status(400).json({
            success: false,
            message: `Thời gian làm việc phải nằm trong khung giờ phòng khám (${clinicHours.startTime} - ${clinicHours.endTime})`,
          });
        }
      }

      updateFields.schedule = schedule;
    }

    if (holidays) {
      updateFields.holidays = holidays.map((date) => new Date(date));
    }

    const existingBookings = await Booking.find({
      doctor: existingSchedule.doctor,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBookings.length > 0) {
      if (schedule) {
        for (const booking of existingBookings) {
          const bookingDay = convertToVietnameseDay(booking.date);
          const daySchedule = schedule.find((s) => s.dayOfWeek === bookingDay);

          if (daySchedule) {
            const bookingStart = moment(booking.startTime, "HH:mm");
            const bookingEnd = moment(booking.endTime, "HH:mm");
            const scheduleStart = moment(daySchedule.startTime, "HH:mm");
            const scheduleEnd = moment(daySchedule.endTime, "HH:mm");

            if (bookingStart < scheduleStart || bookingEnd > scheduleEnd) {
              return res.status(400).json({
                success: false,
                message: "Không thể cập nhật do xung đột với lịch hẹn hiện tại",
              });
            }
          }
        }
      }

      if (holidays) {
        for (const booking of existingBookings) {
          const bookingDate = moment(booking.date).startOf("day");
          const isHoliday = holidays.some((holiday) =>
            moment(holiday).startOf("day").isSame(bookingDate)
          );

          if (isHoliday) {
            return res.status(400).json({
              success: false,
              message: "Không thể đặt ngày nghỉ trùng với lịch hẹn đã có",
            });
          }
        }
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có thông tin nào được cập nhật",
      });
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      existingSchedule._id,
      updateFields,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật lịch làm việc thành công",
      data: updatedSchedule,
    });
  } catch (error) {
    console.error("Update schedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật lịch làm việc",
      error: error.message,
    });
  }
};

export const getScheduleBooking = async (req, res) => {
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

    const schedule = await Schedule.findOne({ doctor: doctorId })
      .populate("doctor", "-password")
      .populate("clinic", "name workingHours")
      .lean();

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

    // Find the schedule for the target date
    const targetDayOfWeek = getDayNumber(targetDate);
    const daySchedule = schedule.schedule.find(
      (day) => day.dayOfWeek === targetDayOfWeek
    );

    if (!daySchedule) {
      return res.status(404).json({
        success: false,
        message: "Không có lịch làm việc cho ngày này",
      });
    }

    // Check if the date is a holiday
    const isHoliday = schedule.holidays.some(
      (holiday) =>
        moment(holiday).format("YYYY-MM-DD") === targetDate.format("YYYY-MM-DD")
    );

    // Get bookings for the target date
    const bookings = await Booking.find({
      doctor: doctorId,
      date: targetDate.toDate(),
      status: { $in: ["pending", "confirmed"] },
    });

    // Process schedule for the target date
    const timeSlots =
      !daySchedule.isActive || isHoliday
        ? []
        : generateAvailableTimeSlots(
            daySchedule.startTime,
            daySchedule.endTime,
            daySchedule.duration,
            daySchedule.breakTime,
            bookings
          );

    return res.status(200).json({
      success: true,
      data: {
        date: targetDate.format("YYYY-MM-DD"),
        dayOfWeek: daySchedule.dayOfWeek,
        isToday: targetDate.isSame(today, "day"),
        isHoliday,
        timeSlots,
      },
    });
  } catch (error) {
    console.error("Get schedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch làm việc",
      error: error.message,
    });
  }
};

export const removeSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

    // Check for future bookings
    const hasBookings = await Booking.exists({
      doctor: schedule.doctor,
      date: { $gte: new Date() },
      status: { $in: ["pending", "confirmed"] },
    });

    if (hasBookings) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa lịch làm việc do còn lịch hẹn trong tương lai",
      });
    }

    await Schedule.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Xóa lịch làm việc thành công",
    });
  } catch (error) {
    console.error("Remove schedule error:", error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xóa lịch làm việc",
      error: error.message,
    });
  }
};
