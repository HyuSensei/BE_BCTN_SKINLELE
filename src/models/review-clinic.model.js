import mongoose from "mongoose";

const ReviewClinicSchema = new mongoose.Schema(
  {
    clinic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

const ReviewClinic = mongoose.model("ReviewClinic", ReviewClinicSchema);

export default ReviewClinic;
