import mongoose from "mongoose";
import moment from "moment";

const ScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true,
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      unique: true,
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
    holidays: [
      {
        type: Date,
        validate: {
          validator: function (value) {
            const dateToCheck = moment(value).format("YYYY-MM-DD");

            const count = this.holidays.reduce((acc, date) => {
              const formattedDate = moment(date).format("YYYY-MM-DD");
              return formattedDate === dateToCheck ? acc + 1 : acc;
            }, 0);

            return count <= 1;
          },
          message: "Ngày nghỉ này đã tồn tại trong danh sách",
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

  if (this.holidays?.length > 0) {
    this.holidays.sort((a, b) => a - b);
  }

  next();
});

ScheduleSchema.index(
  { doctor: 1, holidays: 1 },
  { unique: true, sparse: true }
);

ScheduleSchema.index({ doctor: 1 });
ScheduleSchema.index({ "schedule.dayOfWeek": 1 });
ScheduleSchema.index({ "schedule.isActive": 1 });

const Schedule = mongoose.model("Schedule", ScheduleSchema);

export default Schedule;