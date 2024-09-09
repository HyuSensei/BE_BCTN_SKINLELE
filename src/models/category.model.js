import mongoose from "mongoose";
import slugify from "slugify";

export const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    level: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

CategorySchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true, locale: "vi" });
  next();
});

const Category = mongoose.model("Category", CategorySchema);

export default Category;
