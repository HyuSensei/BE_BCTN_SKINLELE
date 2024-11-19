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
    const { doctorId, date } = req.params;

    const schedule = await Schedule.findOne({ doctor: doctorId });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch làm việc",
      });
    }

    schedule.schedule.forEach((slot) => {
      if (slot.isActive) {
        slot.availableSlots = generateTimeSlots(slot, date);
      }
    });

    return res.json({
      success: true,
      data: {
        schedule,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      data: {},
      error: error.message,
    });
  }
};

const generateTimeSlots = (slot, date) => {
  const timeSlots = [];
  h;
  const dayOfWeek = moment(date).locale("vi").format("dddd");

  if (slot.dayOfWeek === dayOfWeek) {
    let startTime = moment(`${date} ${slot.startTime}`, "YYYY-MM-DD HH:mm");
    const endTime = moment(`${date} ${slot.endTime}`, "YYYY-MM-DD HH:mm");

    while (startTime < endTime) {
      const slotStartTime = startTime.format("HH:mm");
      const slotEndTime = startTime.clone().add(slot.duration, "minutes");

      if (
        !slot.breakTime ||
        slotStartTime >= slot.breakTime.end ||
        slotEndTime.format("HH:mm") <= slot.breakTime.start
      ) {
        timeSlots.push({
          startTime: slotStartTime,
          endTime: slotEndTime.format("HH:mm"),
        });
      }

      startTime = startTime.add(slot.duration, "minutes");
    }
  }

  return timeSlots;
};
