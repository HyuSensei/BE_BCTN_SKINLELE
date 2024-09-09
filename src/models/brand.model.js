import mongoose from "mongoose";
import slugify from "slugify";

export const BrandSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

BrandSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true, locale: "vi" });
  next();
});

const Brand = mongoose.model("Brand", BrandSchema);

export default Brand;
