import Schedule from "../models/schedule.model.js";
import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import Booking from "../models/booking.model.js";
import moment from "moment";

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

    const existingSchedule = await Schedule.findById(id).populate(
      "clinic",
      "workingHours"
    );

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

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

    const existingBookings = await Booking.find({
      doctor: existingSchedule.doctor,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBookings.length > 0) {
      for (const booking of existingBookings) {
        const bookingDay = moment(booking.date).format("dddd");
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

        // Check if booking date falls on a new holiday
        if (holidays) {
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

    const formattedHolidays = holidays
      ? holidays.map((date) => new Date(date))
      : existingSchedule.holidays;

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      {
        schedule,
        holidays: formattedHolidays,
      },
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

    const weekStart = targetDate.clone().startOf("week");
    const weekEnd = targetDate.clone().endOf("week");

    const schedule = await Schedule.findOne({ doctor: doctorId })
      .populate("doctor", "-password")
      .populate("clinic", "name workingHours");

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

    const bookings = await Booking.find({
      doctor: doctorId,
      date: {
        $gte: weekStart.toDate(),
        $lte: weekEnd.toDate(),
      },
      status: { $in: ["pending", "confirmed"] },
    });

    const processedSchedule = schedule.schedule.map((day) => {
      const dayDate = weekStart
        .clone()
        .day(getDayNumber(day.dayOfWeek))
        .format("YYYY-MM-DD");

      // Check if the day is a holiday
      const isHoliday = schedule.holidays.some(
        (holiday) => moment(holiday).format("YYYY-MM-DD") === dayDate
      );

      const dayBookings = bookings.filter(
        (booking) => moment(booking.date).format("YYYY-MM-DD") === dayDate
      );

      return {
        dayOfWeek: day.dayOfWeek,
        date: dayDate,
        startTime: day.startTime,
        endTime: day.endTime,
        duration: day.duration,
        breakTime: day.breakTime,
        isToday: dayDate === today.format("YYYY-MM-DD"),
        isHoliday: isHoliday,
        timeSlots: isHoliday
          ? []
          : generateAvailableTimeSlots(
              day.startTime,
              day.endTime,
              day.duration,
              day.breakTime,
              dayBookings
            ),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        schedule: processedSchedule,
        holidays: schedule.holidays,
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

function getDayNumber(dayOfWeek) {
  const days = {
    "Thứ 2": 1,
    "Thứ 3": 2,
    "Thứ 4": 3,
    "Thứ 5": 4,
    "Thứ 6": 5,
    "Thứ 7": 6,
    "Chủ nhật": 0,
  };
  return days[dayOfWeek];
}

// Helper function to generate available time slots
function generateAvailableTimeSlots(
  startTime,
  endTime,
  duration,
  breakTime,
  bookings
) {
  const slots = [];
  let currentTime = moment(startTime, "HH:mm");
  const endTimeObj = moment(endTime, "HH:mm");

  while (currentTime.isBefore(endTimeObj)) {
    const slotTime = currentTime.format("HH:mm");

    // Skip break time
    if (breakTime && slotTime >= breakTime.start && slotTime < breakTime.end) {
      currentTime.add(duration, "minutes");
      continue;
    }

    // Check if slot is available
    const isBooked = bookings.some((booking) => booking.startTime === slotTime);

    if (!isBooked) {
      slots.push({
        startTime: slotTime,
        endTime: currentTime.add(duration, "minutes").format("HH:mm"),
      });
    } else {
      currentTime.add(duration, "minutes");
    }
  }

  return slots;
}

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
