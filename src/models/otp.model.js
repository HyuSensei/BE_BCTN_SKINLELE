import mongoose from "mongoose";

export const OtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
    },
    otp: {
      type: Number,
    },
    exp: {
      type: Number,
      default: 5,
    },
  },
  { timestamps: true }
);

const Otp = mongoose.model("Otp", OtpSchema);

export default Otp;
