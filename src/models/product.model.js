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
        quantity: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
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
    totalQuantity: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

ProductSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true, locale: "vi" });

  let variantsTotal = 0;
  if (this.variants && this.variants.length > 0) {
    variantsTotal = this.variants.reduce(
      (sum, variant) => sum + variant.quantity,
      0
    );
  }

  this.totalQuantity = variantsTotal;
  next();
});

ProductSchema.pre("validate", function (next) {
  if (this.variants && this.variants.length > 0) {
    for (const variant of this.variants) {
      if (variant.quantity < 0) {
        next(new Error("Số lượng variant không thể là số âm"));
        return;
      }
    }
  }
  if (this.quantity < 0) {
    next(new Error("Số lượng sản phẩm không thể là số âm"));
    return;
  }
  next();
});

const Product = mongoose.model("Product", ProductSchema);

export default Product;
