// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String,
  image: String,
  seen: { type: Boolean, default: false },
  delivered: { type: Boolean, default: false },   // ✅ new
  edited: { type: Boolean, default: false },      // ✅ new
  deleted: { type: Boolean, default: false },     // ✅ new
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);
