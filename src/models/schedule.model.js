const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    schedule: [
      {
        dayOfWeek: {
          type: String,
          enum: [
            "Thứ 2",
            "Thứ 3",
            "Thứ 4",
            "Thứ 5",
            "Thứ 6",
            "Thứ 7",
            "Chủ nhật",
          ],
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
        duration: {
          type: Number,
          default: 15,
        },
        breakTime: {
          start: String,
          end: String,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { timestamps: true }
);

ScheduleSchema.pre("save", function (next) {
  this.schedule.forEach((slot) => {
    if (slot.startTime >= slot.endTime) {
      throw new Error("Thời gian bắt đầu phải trước thời gian kết thúc");
    }
  });
  next();
});

ScheduleSchema.index({ doctor: 1 });
ScheduleSchema.index({ "schedule.dayOfWeek": 1 });
ScheduleSchema.index({ "schedule.isActive": 1 });

const Schedule = mongoose.model("Schedule", ScheduleSchema);

export default Schedule;
