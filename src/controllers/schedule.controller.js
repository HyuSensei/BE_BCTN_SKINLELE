// import Booking from "../models/booking.model.js";
// import Schedule from "../models/schedule.model.js";
// import moment from "moment";

// export const createSchedule = async (req, res) => {
//   try {
//     const { doctor, schedule } = req.body;

//     const existSchedule = await Schedule.exists({ doctor });
//     if (existSchedule) throw new Error("Lịch làm việc đã được tạo trước đó !");

//     const newSchedule = await Schedule.create({
//       doctor,
//       schedule,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Tạo lịch làm việc thành công",
//       data: newSchedule,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: "Có lỗi xảy ra khi tạo lịch làm việc",
//       error: error.message,
//     });
//   }
// };

// export const updateSchedule = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { schedule } = req.body;

//     const updatedSchedule = await Schedule.findByIdAndUpdate(
//       id,
//       { schedule },
//       { new: true }
//     );

//     if (!updatedSchedule) {
//       return res.status(404).json({
//         success: false,
//         message: "Không tìm thấy lịch làm việc",
//       });
//     }

//     return res.json({
//       success: true,
//       message: "Cập nhật lịch làm việc thành công",
//       data: updatedSchedule,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: "Có lỗi xảy ra khi cập nhật lịch làm việc",
//       error: error.message,
//     });
//   }
// };

// export const removeSchedule = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deletedSchedule = await Schedule.findByIdAndDelete(id);

//     if (!deletedSchedule) {
//       return res.status(404).json({
//         success: false,
//         message: "Không tìm thấy lịch làm việc",
//       });
//     }

//     return res.json({
//       success: true,
//       message: "Xóa lịch làm việc thành công",
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       success: false,
//       message: "Có lỗi xảy ra khi xóa lịch làm việc",
//       error: error.message,
//     });
//   }
// };

// export const getScheduleBooking = async (req, res) => {
//   try {
//     const { doctorId } = req.params;
//     const today = moment().format("YYYY-MM-DD");
//     const targetDate = req.query.date || today;

//     const startOfWeek = moment(targetDate).startOf("week");
//     const endOfWeek = moment(targetDate).endOf("week");

//     const schedule = await Schedule.findOne({ doctor: doctorId }).populate({
//       path: "doctor",
//       select: "-password -__v -createdAt -updatedAt",
//     });

//     if (!schedule) {
//       return res.status(404).json({
//         success: false,
//         message: "Không tìm thấy lịch làm việc",
//       });
//     }

//     const bookings = await Booking.find({
//       doctor: doctorId,
//       date: {
//         $gte: startOfWeek.toDate(),
//         $lte: endOfWeek.toDate(),
//       },
//       status: { $in: ["pending", "confirmed"] },
//     }).select("date startTime endTime");

//     const bookingMap = bookings.reduce((acc, booking) => {
//       const dayOfWeek = moment(booking.date).locale("vi").format("dddd");
//       if (!acc[dayOfWeek]) {
//         acc[dayOfWeek] = [];
//       }
//       acc[dayOfWeek].push({
//         startTime: booking.startTime,
//         endTime: booking.endTime,
//       });
//       return acc;
//     }, {});

//     const processedSchedule = schedule.schedule
//       .filter((slot) => slot.isActive)
//       .map((slot) => {
//         const slotDate = moment(startOfWeek)
//           .day(moment().locale("vi").day(slot.dayOfWeek).day())
//           .format("YYYY-MM-DD");

//         const timeSlots = generateTimeSlots(
//           slot,
//           bookingMap[slot.dayOfWeek] || []
//         );

//         return {
//           dayOfWeek: slot.dayOfWeek,
//           date: slotDate,
//           startTime: slot.startTime,
//           endTime: slot.endTime,
//           duration: slot.duration,
//           breakTime: slot.breakTime,
//           isToday: slotDate === today,
//           timeSlots,
//         };
//       });

//     return res.json({
//       success: true,
//       data: {
//         doctor: schedule.doctor,
//         weekRange: {
//           start: startOfWeek.format("YYYY-MM-DD"),
//           end: endOfWeek.format("YYYY-MM-DD"),
//           today,
//         },
//         schedule: processedSchedule,
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Lỗi khi lấy lịch làm việc",
//       error: error.message,
//     });
//   }
// };

// const generateTimeSlots = (slot, existingBookings) => {
//   const timeSlots = [];
//   const [startHour, startMinute] = slot.startTime.split(":");
//   const [endHour, endMinute] = slot.endTime.split(":");

//   let currentMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
//   const endMinutes = parseInt(endHour) * 60 + parseInt(endMinute);

//   while (currentMinutes + slot.duration <= endMinutes) {
//     const startTime = formatTime(currentMinutes);
//     const endTime = formatTime(currentMinutes + slot.duration);

//     const isBreakTime =
//       slot.breakTime &&
//       startTime >= slot.breakTime.start &&
//       endTime <= slot.breakTime.end;

//     const isBooked = existingBookings.some(
//       (booking) => booking.startTime === startTime
//     );

//     if (!isBreakTime) {
//       timeSlots.push({
//         startTime,
//         endTime,
//         isBooked,
//       });
//     }

//     currentMinutes += slot.duration;
//   }

//   return timeSlots;
// };

// const formatTime = (minutes) => {
//   const hours = Math.floor(minutes / 60);
//   const mins = minutes % 60;
//   return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
// };

import Schedule from "../models/schedule.model.js";
import Clinic from "../models/clinic.model.js";
import Doctor from "../models/doctor.model.js";
import Booking from "../models/booking.model.js";
import moment from "moment";

export const createSchedule = async (req, res) => {
  try {
    const { doctor, clinic, schedule } = req.body;
    // Validate doctor exists and belongs to clinic
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

    // Get clinic working hours
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

    const newSchedule = await Schedule.create({
      doctor,
      clinic,
      schedule: schedule.map((slot) => ({
        ...slot,
        duration: slot.duration || 15,
      })),
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
    const { schedule } = req.body;

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

    // Validate new schedule against clinic hours
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

    // Check for existing bookings
    const existingBookings = await Booking.find({
      doctor: existingSchedule.doctor,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBookings.length > 0) {
      // Validate that schedule changes don't conflict with existing bookings
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
      }
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { schedule },
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
        availableSlots: generateAvailableTimeSlots(
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
        doctor: schedule.doctor,
        clinic: schedule.clinic,
        weekRange: {
          start: weekStart.format("YYYY-MM-DD"),
          end: weekEnd.format("YYYY-MM-DD"),
          today: today.format("YYYY-MM-DD"),
        },
        schedule: processedSchedule,
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
