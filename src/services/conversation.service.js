import Admin from "../models/admin.model.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";

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

const formattedConversations = (conversations) => {
  if (!conversations.length) return [];

  return conversations.map((conversation) => {
    const formattedSender = formatUserByRole(
      conversation.sender._id,
      conversation.sender.role
    );

    const formattedReceiver = formatUserByRole(
      conversation.receiver._id,
      conversation.receiver.role
    );

    const formattedLastMessage = conversation.lastMessage
      ? {
          isRead: conversation.lastMessage.isRead,
          sender: conversation.lastMessage.sender._id,
          receiver: conversation.lastMessage.receiver._id,
          content: conversation.lastMessage.content,
          attachments: conversation.lastMessage.attachments,
          createdAt: conversation.lastMessage.createdAt,
        }
      : null;

    return {
      ...conversation.toObject(),
      sender: {
        ...formattedSender,
        role: conversation.sender.role,
      },
      receiver: {
        ...formattedReceiver,
        role: conversation.receiver.role,
      },
      lastMessage: formattedLastMessage,
    };
  });
};

export const getAllSupportConversation = async (userId) => {
  try {
    const admins = await Admin.find({
      role: { $in: ["ADMIN", "SUPPORT"] },
      isActive: true,
    });

    if (!admins.length) {
      return [];
    }

    const conversations = await Promise.all(
      admins.map(async (admin) => {
        return await Conversation.findOne({
          $or: [
            { "sender._id": admin._id, "receiver._id": userId },
            { "receiver._id": admin._id, "sender._id": userId },
          ],
        })
          .populate("sender._id")
          .populate("receiver._id")
          .populate("lastMessage");
      })
    );

    const validConversations = conversations.filter((conv) => conv);
    const formattedConversationsList =
      formattedConversations(validConversations);

    const result = admins.map((admin) => {
      const adminConversation = formattedConversationsList.find(
        (conv) =>
          String(conv.sender._id) === String(admin._id) ||
          String(conv.receiver._id) === String(admin._id)
      );
      return {
        admin,
        conversation: adminConversation || null,
      };
    });

    return result;
  } catch (error) {
    console.log("Error all support conversation: ", error);
    return [];
  }
};

export const getAllCustomerConversation = async (adminId) => {
  try {
    const customers = await User.find({ isActive: true }).select(
      "-password -__v"
    );
    if (!customers.length) {
      return [];
    }

    const conversations = await Promise.all(
      customers.map(async (customer) => {
        return await Conversation.findOne({
          $or: [
            { "sender._id": customer._id, "receiver._id": adminId },
            { "receiver._id": customer._id, "sender._id": adminId },
          ],
        })
          .populate("sender._id")
          .populate("receiver._id")
          .populate("lastMessage");
      })
    );
    const validConversations = conversations.filter((conv) => conv);
    const formattedConversationsList =
      formattedConversations(validConversations);

    const result = customers.map((customer) => {
      const customerConversation = formattedConversationsList.find(
        (conv) =>
          String(conv.sender._id) === String(customer._id) ||
          String(conv.receiver._id) === String(customer._id)
      );
      return {
        customer,
        conversation: customerConversation || null,
      };
    });

    return result;
  } catch (error) {
    console.log("Error all customer conversation: ", error);
    return [];
  }
};

export const getConversation = async (payload) => {
  try {
    const conversation = await Conversation.findOne({
      $or: [
        {
          "sender._id": payload[0],
          "receiver._id": payload[1],
        },
        {
          "sender._id": payload[1],
          "receiver._id": payload[0],
        },
      ],
      isActive: true,
    }).populate("lastMessage");
    return conversation || null;
  } catch (error) {
    console.log("Error get conversation: ", error);
  }
};
