import mongoose from "mongoose";
import slugify from "slugify";

const PromotionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    banner: {
      url: {
        type: String,
      },
      publicId: {
        type: String,
      },
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
        maxDiscountAmount: {
          type: Number,
          default: 0,
        },
      },
    ],
    slug: {
      type: String,
      lowercase: true,
      unique: true,
    },
  },
  { timestamps: true }
);

PromotionSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true, locale: "vi" });
  next();
});

const Promotion = mongoose.model("Promotion", PromotionSchema);

export default Promotion;
