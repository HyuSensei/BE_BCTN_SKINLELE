import Booking from "../models/booking.model.js";
import Schedule from "../models/schedule.model.js";
import moment from "moment";

export const createSchedule = async (req, res) => {
  try {
    const { doctor, schedule } = req.body;

    const existSchedule = await Schedule.exists({ doctor });
    if (existSchedule) throw new Error("Lịch làm việc đã được tạo trước đó !");

    const newSchedule = await Schedule.create({
      doctor,
      schedule,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo lịch làm việc thành công",
      data: newSchedule,
    });
  } catch (error) {
    console.log(error);
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

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { schedule },
      { new: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

    return res.json({
      success: true,
      message: "Cập nhật lịch làm việc thành công",
      data: updatedSchedule,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật lịch làm việc",
      error: error.message,
    });
  }
};

export const removeSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSchedule = await Schedule.findByIdAndDelete(id);

    if (!deletedSchedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

    return res.json({
      success: true,
      message: "Xóa lịch làm việc thành công",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xóa lịch làm việc",
      error: error.message,
    });
  }
};

export const getScheduleByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const today = moment().format("YYYY-MM-DD");
    const targetDate = req.query.date || today;

    const startOfWeek = moment(targetDate).startOf("week");
    const endOfWeek = moment(targetDate).endOf("week");

    const schedule = await Schedule.findOne({ doctor: doctorId }).populate({
      path: "doctor",
      select: "-password -__v -createdAt -updatedAt",
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

    const bookings = await Booking.find({
      doctor: doctorId,
      date: {
        $gte: startOfWeek.toDate(),
        $lte: endOfWeek.toDate(),
      },
      status: { $in: ["pending", "confirmed"] },
    }).select("date startTime endTime");

    const bookingMap = bookings.reduce((acc, booking) => {
      const dayOfWeek = moment(booking.date).locale("vi").format("dddd");
      if (!acc[dayOfWeek]) {
        acc[dayOfWeek] = [];
      }
      acc[dayOfWeek].push({
        startTime: booking.startTime,
        endTime: booking.endTime,
      });
      return acc;
    }, {});

    const processedSchedule = schedule.schedule
      .filter((slot) => slot.isActive)
      .map((slot) => {
        const slotDate = moment(startOfWeek)
          .day(moment().locale("vi").day(slot.dayOfWeek).day())
          .format("YYYY-MM-DD");

        const timeSlots = generateTimeSlots(
          slot,
          bookingMap[slot.dayOfWeek] || []
        );

        return {
          dayOfWeek: slot.dayOfWeek,
          date: slotDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration,
          breakTime: slot.breakTime,
          isToday: slotDate === today,
          timeSlots,
        };
      });

    return res.json({
      success: true,
      data: {
        doctor: schedule.doctor,
        weekRange: {
          start: startOfWeek.format("YYYY-MM-DD"),
          end: endOfWeek.format("YYYY-MM-DD"),
          today,
        },
        schedule: processedSchedule,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch làm việc",
      error: error.message,
    });
  }
};

const generateTimeSlots = (slot, existingBookings) => {
  const timeSlots = [];
  const [startHour, startMinute] = slot.startTime.split(":");
  const [endHour, endMinute] = slot.endTime.split(":");

  let currentMinutes = parseInt(startHour) * 60 + parseInt(startMinute);
  const endMinutes = parseInt(endHour) * 60 + parseInt(endMinute);

  while (currentMinutes + slot.duration <= endMinutes) {
    const startTime = formatTime(currentMinutes);
    const endTime = formatTime(currentMinutes + slot.duration);

    const isBreakTime =
      slot.breakTime &&
      startTime >= slot.breakTime.start &&
      endTime <= slot.breakTime.end;

    const isBooked = existingBookings.some(
      (booking) => booking.startTime === startTime
    );

    if (!isBreakTime) {
      timeSlots.push({
        startTime,
        endTime,
        isBooked,
      });
    }

    currentMinutes += slot.duration;
  }

  return timeSlots;
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};
