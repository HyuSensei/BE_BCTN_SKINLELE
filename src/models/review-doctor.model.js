import mongoose from "mongoose";

const ReviewDoctorSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    rate: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isActive:{
      type: Boolean,
      default:true
    }
  },
  { timestamps: true }
);

const ReviewDoctor = mongoose.model("ReviewDoctor", ReviewDoctorSchema);

export default ReviewDoctor;
