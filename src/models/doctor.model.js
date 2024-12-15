import mongoose from "mongoose";
import slugify from "slugify";
import bcrypt from "bcryptjs";
import moment from "moment";

export const DocterSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
    },
    specialty: {
      type: String,
      required: true,
    },
    experience: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
    },
    about: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 15,
    },
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
    fees: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

DocterSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true, locale: "vi" });
  next();
});

DocterSchema.pre("save", function (next) {
  if (!this.isModified("password")) return next();
  bcrypt.hash(this.password, 10, (err, hash) => {
    if (err) return next(err);
    this.password = hash;
    next();
  });
});

const Doctor = mongoose.model("Doctor", DocterSchema);

export default Doctor;
