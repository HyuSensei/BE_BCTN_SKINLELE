import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

const pickFields = (obj, fields) => {
  return fields.reduce((result, field) => {
    if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
    return result;
  }, {});
};

const formatUserByRole = (user, role) => {
  if (!user) return null;
  switch (role) {
    case "Admin":
      return pickFields(user, ["_id", "name", "avatar"]);
    case "Doctor":
      return pickFields(user, ["_id", "name", "email", "avatar", "specialty"]);
    case "Clinic":
      return pickFields(user, ["_id", "name", "email", "logo", "admin"]);
    default:
      return pickFields(user, ["_id", "name", "email", "avatar"]);
  }
};

const formattedMessages = (messages) => {
  if (!messages.length) return [];

  return messages.map((message) => {
    const formattedSender = formatUserByRole(
      message.sender._id,
      message.sender.role
    );
    const formattedReceiver = formatUserByRole(
      message.receiver._id,
      message.receiver.role
    );

    return {
      ...message.toObject(),
      sender: {
        ...formattedSender,
        role: message.sender.role,
      },
      receiver: {
        ...formattedReceiver,
        role: message.receiver.role,
      },
    };
  });
};

export const createMessage = async ({
  type,
  sender,
  receiver,
  content,
  attachments = [],
}) => {
  try {
    let conversation = await Conversation.findOne({
      $or: [
        {
          "sender._id": sender._id,
          "receiver._id": receiver._id,
        },
        {
          "sender._id": receiver._id,
          "receiver._id": sender._id,
        },
      ],
    });

    if (!conversation) {
      conversation = new Conversation({
        type,
        sender,
        receiver,
        messages: [],
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender,
      receiver,
      content,
      attachments: attachments || [],
      status: "sent",
    });

    if (conversation) {
      conversation.messages.push(message._id);
      conversation.lastMessage = message._id;
    }

    await conversation.save();

    let result = null;
    if (message) {
      const populatedMessage = await Message.findById(message._id)
        .populate({
          path: "sender._id",
          refPath: "sender.role",
        })
        .populate({
          path: "receiver._id",
          refPath: "receiver.role",
        })
        .populate("conversation");

      result = formattedMessages([populatedMessage])[0];
    }
    return result;
  } catch (error) {
    console.log("Error create message: ", error);
    return null;
  }
};

export const getMessages = async (conversationId) => {
  try {
    if (!conversationId) return [];

    const conversation = await Conversation.findOne({
      _id: conversationId,
      isActive: true,
    });

    if (!conversation) return [];

    const messages = await Message.find({
      conversation: conversation._id,
    })
      .sort({ createdAt: 1 })
      .populate({
        path: "sender._id",
        refPath: "sender.role",
      })
      .populate({
        path: "receiver._id",
        refPath: "sender.role",
      })
      .populate("conversation");

    return formattedMessages(messages);
  } catch (error) {
    console.log("Error get message: ", error);
    return [];
  }
};

export const updateSeenMessage = async (conversationId) => {
  try {
    await Message.updateMany(
      { conversation: conversationId, isRead: false },
      { isRead: true }
    );

    const messages = await Message.find({
      conversation: conversationId,
    })
      .sort({ updatedAt: 1 })
      .populate({
        path: "sender._id",
        refPath: "sender.role",
      })
      .populate({
        path: "receiver._id",
        refPath: "sender.role",
      })
      .populate("conversation");

    return formattedMessages(messages);
  } catch (error) {
    console.log("Error update seen message: ", error);
    return [];
  }
};
