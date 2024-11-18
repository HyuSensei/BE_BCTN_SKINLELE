const mongoose = require("mongoose");

const ReviewDoctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
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
  },
  { timestamps: true }
);

const ReviewDoctor = mongoose.model("ReviewDoctor", ReviewDoctorSchema);

export default ReviewDoctor;
