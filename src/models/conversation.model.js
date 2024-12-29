// conversation.model.js
import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["User_Admin", "User_Doctor", "User_Clinic"],
      default: "User_Admin",
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
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ createdAt: -1 });
ConversationSchema.index({ "sender._id": 1 });
ConversationSchema.index({ "receiver._id": 1 });
ConversationSchema.index({ isActive: 1 });

const Conversation = mongoose.model("Conversation", ConversationSchema);

export default Conversation;
