import mongoose from "mongoose";

const PromotionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        discountPercentage: {
          type: Number,
          min: 0,
          max: 100,
        },
        maxQty: {
          type: Number,
          min: 1,
        },
        usedQty: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

const Promotion = mongoose.model("Promotion", PromotionSchema);

export default Promotion;
