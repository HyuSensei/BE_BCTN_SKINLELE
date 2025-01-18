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
    cost: {
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

  if (this.variants && this.variants.length > 0) {
    let variantsTotal = this.variants.reduce(
      (sum, variant) => sum + variant.quantity,
      0
    );
    this.totalQuantity = variantsTotal;
  } else if (!this.isModified("totalQuantity")) {
    this.totalQuantity = this.totalQuantity || 0;
  }

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

export const initializeProductCosts = async () => {
  try {
    // Find all products that don't have a cost set
    const products = await Product.find({ cost: { $exists: false } });

    if (products.length === 0) {
      console.log("No products found needing cost initialization");
      return;
    }

    const bulkOps = products.map((product) => {
      // Business rules for calculating cost:
      // 1. Basic products (price < 100,000): 70% of price
      // 2. Mid-range products (100,000 - 500,000): 65% of price
      // 3. Premium products (500,000 - 1,000,000): 60% of price
      // 4. Luxury products (> 1,000,000): 55% of price
      let costPercentage;

      if (product.price < 100000) {
        costPercentage = 0.7; // 70% of price
      } else if (product.price < 500000) {
        costPercentage = 0.65; // 65% of price
      } else if (product.price < 1000000) {
        costPercentage = 0.6; // 60% of price
      } else {
        costPercentage = 0.55; // 55% of price
      }

      const calculatedCost = Math.round(product.price * costPercentage);

      return {
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { cost: calculatedCost } },
          upsert: false,
        },
      };
    });

    if (bulkOps.length > 0) {
      const result = await Product.bulkWrite(bulkOps);
      console.log(`Updated costs for ${result.modifiedCount} products`);
      return result;
    }
  } catch (error) {
    console.error("Error initializing product costs:", error);
    throw error;
  }
};

export default Product;
