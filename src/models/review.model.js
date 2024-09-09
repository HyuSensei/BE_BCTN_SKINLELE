import mongoose from "mongoose";

export const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    rate: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],
    comment: {
      type: String,
      required: true,
    },
    display: {
      type: Boolean,
      default: true,
    },
    reply: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", ReviewSchema);

export default Review;
