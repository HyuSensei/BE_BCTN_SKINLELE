import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customer: {
      name: {
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
      dateOfBirth: {
        type: Date,
        required: true,
      },
      gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },
    date: {
      type: Date,
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
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    price: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    cancelReason: {
      type: String,
      default: "",
    },
    statusHistory: [
      {
        prevStatus: String,
        status: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "statusHistory.updatedByModel",
        },
        updatedByModel: {
          type: String,
          enum: ["User", "Doctor"],
        },
      },
    ],
  },
  { timestamps: true }
);

BookingSchema.index({ doctor: 1, date: 1, startTime: 1 });
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ status: 1, date: 1 });
BookingSchema.index({ "customer.email": 1 });
BookingSchema.index({ "customer.phone": 1 });

const Booking = mongoose.model("Booking", BookingSchema);

export default Booking;
