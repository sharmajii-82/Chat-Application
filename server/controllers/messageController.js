// controllers/messageController.js
import Message from "../models/Message.js";
import User from "../models/User.js";
import { io, userSocketMap } from "../server.js";

/** GET conversation messages with a user */
export const getMessages = async (req, res) => {
  try {
    const otherId = req.params.id;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/** GET sidebar users + unseen count per user */
export const getUsersForSidebar = async (req, res) => {
  try {
    const myId = req.user._id;

    const users = await User.find({ _id: { $ne: myId } })
      .select("_id fullName profilePic")
      .lean();

    // unseen per user: messages they sent to me that I haven't seen
    const countsAgg = await Message.aggregate([
      { $match: { receiverId: myId, seen: { $ne: true } } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

    const unseenMessages = {};
    countsAgg.forEach((c) => {
      unseenMessages[String(c._id)] = c.count;
    });

    res.json({ success: true, users, unseenMessages });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/** POST send message */
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image,
      delivered: false,
      seen: false,
    });

    // mark delivered if receiver is online and emit
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      newMessage.delivered = true;
      await newMessage.save();
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/** PUT mark a single message as seen */
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params; // message id
    const message = await Message.findByIdAndUpdate(
      id,
      { seen: true },
      { new: true }
    );
    if (message) {
      const senderSocketId = userSocketMap[message.senderId];
      if (senderSocketId) io.to(senderSocketId).emit("messageSeen", message);
    }
    res.json({ success: true, message });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/** PUT mark all unseen messages in a conversation as seen */
export const markConversationAsSeen = async (req, res) => {
  try {
    const otherId = req.params.id;
    const myId = req.user._id;

    const unseenDocs = await Message.find({
      senderId: otherId,
      receiverId: myId,
      seen: { $ne: true },
    }).select("_id senderId receiverId");

    if (!unseenDocs.length) {
      return res.json({ success: true, updated: 0, messageIds: [] });
    }

    const msgIds = unseenDocs.map((d) => d._id);

    await Message.updateMany(
      { _id: { $in: msgIds } },
      { $set: { seen: true } }
    );

    // notify sender that their messages were seen
    const senderSocketId = userSocketMap[otherId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", {
        byUserId: myId,
        otherId,
        messageIds: msgIds,
      });
    }

    res.json({ success: true, updated: msgIds.length, messageIds: msgIds });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/** PUT edit message */
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const myId = req.user._id;

    const message = await Message.findById(id);
    if (!message)
      return res.json({ success: false, message: "Message not found" });

    if (String(message.senderId) !== String(myId)) {
      return res.json({ success: false, message: "Not allowed to edit this message" });
    }

    message.text = text;
    message.edited = true;
    await message.save();

    // notify both parties
    const receiverSocketId = userSocketMap[message.receiverId];
    if (receiverSocketId) io.to(receiverSocketId).emit("messageEdited", message);
    const senderSocketId = userSocketMap[message.senderId];
    if (senderSocketId) io.to(senderSocketId).emit("messageEdited", message);

    res.json({ success: true, message });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/** DELETE message */
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { forEveryone } = req.body;
    const myId = req.user._id;

    let message = await Message.findById(id);
    if (!message)
      return res.json({ success: false, message: "Message not found" });

    if (forEveryone) {
      // only sender can delete for everyone
      if (String(message.senderId) !== String(myId)) {
        return res.json({ success: false, message: "Not allowed to delete this message for everyone" });
      }
      message.deleted = true;
      message.text = "";
      message.image = "";
      await message.save();
    }

    // notify both sides
    const receiverSocketId = userSocketMap[message.receiverId];
    if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", message);
    const senderSocketId = userSocketMap[message.senderId];
    if (senderSocketId) io.to(senderSocketId).emit("messageDeleted", message);

    res.json({ success: true, message });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
