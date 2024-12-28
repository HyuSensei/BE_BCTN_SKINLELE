import mongoose from "mongoose";

const DoctorMatchSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      index: true,
    },
    productCount: {
      type: Number,
      default: 0,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        score: Number,
      },
    ],
  },
  {
    timestamps: true,
    indexes: [
      { doctor: 1, category: 1 },
      { category: 1, score: -1 },
    ],
  }
);

const DoctorMatch = mongoose.model("DoctorMatch", DoctorMatchSchema);

export default DoctorMatch;
