import mongoose from "mongoose";

const ClinicSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    specialties: [String],
    name: {
      type: String,
      required: true,
    },
    logo: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        default: "",
      },
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    description: {
      type: String,
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
          default: "",
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Clinic = mongoose.model("Clinic", ClinicSchema);

export default Clinic;
