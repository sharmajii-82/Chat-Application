// routes/messageRoutes.js
import express from "express";
import { protectRoute } from "../middleware/auth.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  markMessageAsSeen,       // mark a single message as seen
  markConversationAsSeen,  // mark all messages in a conversation as seen
  editMessage,
  deleteMessage,
} from "../controllers/messageController.js";

const messageRouter = express.Router();

// --- GET routes ---
messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);

// --- POST routes ---
messageRouter.post("/send/:id", protectRoute, sendMessage);

// --- PUT routes ---
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen);
messageRouter.put("/mark-conversation/:id", protectRoute, markConversationAsSeen);
messageRouter.put("/edit/:id", protectRoute, editMessage);

// --- DELETE routes ---
messageRouter.delete("/delete/:id", protectRoute, deleteMessage);

export default messageRouter;
