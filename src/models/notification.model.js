import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      default: "",
      refPath: "model",
    },
    model: {
      type: String,
      required: true,
      enum: ["User", "Admin", "Doctor", "Clinic"],
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["STORE", "BOOKING"],
      default: "STORE",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ model: 1 });

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
