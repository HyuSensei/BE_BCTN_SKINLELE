// message.model.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "sender.role",
        required: true,
      },
      role: {
        type: String,
        enum: ["User", "Admin", "Doctor", "Clinic"],
        required: true,
      },
    },
    receiver: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "receiver.role",
        required: true,
      },
      role: {
        type: String,
        enum: ["User", "Admin", "Doctor", "Clinic"],
        required: true,
      },
    },
    content: {
      type: String,
    },
    attachments: [
      {
        url: String,
        publicId: String,
        type: {
          type: String,
          enum: ["image", "video"],
          default: "image",
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ "sender._id": 1, "sender.role": 1 });
MessageSchema.index({ "receiver._id": 1, "receiver.role": 1 });
MessageSchema.index({ status: 1 });

const Message = mongoose.model("Message", MessageSchema);

export default Message;
