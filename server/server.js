import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import UserRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

// ✅ CORS Fix
app.use(
  cors({
    origin: [
      "http://localhost:5173",            // Local frontend
      "https://chatbysaurabh.netlify.app" // Netlify deployed frontend
    ],
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// ✅ Status Route for testing
app.get("/api/status", (req, res) => {
  res.json({ success: true, message: "Backend is running fine 🚀" });
});

// API Routes
app.use("/api/auth", UserRouter);
app.use("/api/messages", messageRouter);

// Socket.io Setup
export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://chatbysaurabh.netlify.app"
    ],
    credentials: true,
  },
});

// MongoDB Connection
connectDB();

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
