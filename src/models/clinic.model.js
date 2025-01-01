import moment from "moment";
import mongoose from "mongoose";
import slugify from "slugify";

const weekdays = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

const ClinicSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      unique: true,
    },
    specialties: [String],
    name: {
      type: String,
      required: true,
    },
    logo: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        default: "",
      },
    },
    banners: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          default: "",
        },
      },
    ],
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          default: "",
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    workingHours: [
      {
        dayOfWeek: {
          type: String,
          enum: weekdays,
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        breakTime: {
          start: String,
          end: String,
        },
        endTime: {
          type: String,
          required: true,
        },
        isOpen: {
          type: Boolean,
          default: false,
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

ClinicSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true, locale: "vi" });
  next();
});

ClinicSchema.virtual("doctorCount", {
  ref: "Doctor",
  localField: "_id",
  foreignField: "clinic",
  count: true,
});

ClinicSchema.virtual("averageRating", {
  ref: "ReviewClinic",
  localField: "_id",
  foreignField: "clinic",
  options: { match: { isActive: true } },
});

ClinicSchema.index({ slug: 1 }, { unique: true });
ClinicSchema.index({ isActive: 1 });

const Clinic = mongoose.model("Clinic", ClinicSchema);

export default Clinic;
