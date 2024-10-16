import mongoose from "mongoose";
import slugify from "slugify";

export const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
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
    slug: {
      type: String,
      lowercase: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    mainImage: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
    },
    variants: [
      {
        color: {
          name: {
            type: String,
            default: "",
          },
          code: {
            type: String,
            default: "",
          },
          image: {
            url: {
              type: String,
              default: "",
            },
            publicId: {
              type: String,
              default: "",
            },
          },
        },
      },
    ],
    enable: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        default: [],
        enum: ["HOT", "NEW", "SALE", "SELLING", "TREND"],
      },
    ],
    expiry: {
      type: Date,
      required: true,
    },
    isAlmostExpired: {
      type: Boolean,
      default: false,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    capacity: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

ProductSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true, locale: "vi" });
  next();
});

const Product = mongoose.model("Product", ProductSchema);

export default Product;
