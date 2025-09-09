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

export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // local dev
      "https://chat-application-sepia-psi.vercel.app", // deployed frontend
    ],
    credentials: true, // in case you use cookies/auth
  },
});

export const userSocketMap = {}; // { userId: socketId }

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUser", Object.keys(userSocketMap));

  // ✅ ---- CALL SIGNALING EVENTS ----
  socket.on("call:initiate", ({ toUserId, fromUser, callType }) => {
    const calleeSocket = userSocketMap[toUserId];
    if (!calleeSocket) {
      socket.emit("call:unavailable", { toUserId });
      return;
    }
    io.to(calleeSocket).emit("call:ring", { fromUser, callType });
  });

  socket.on("call:accept", ({ toUserId }) => {
    const callerSocket = userSocketMap[toUserId];
    if (callerSocket) io.to(callerSocket).emit("call:accepted");
  });

  socket.on("call:reject", ({ toUserId, reason = "rejected" }) => {
    const callerSocket = userSocketMap[toUserId];
    if (callerSocket) io.to(callerSocket).emit("call:rejected", { reason });
  });

  socket.on("call:busy", ({ toUserId }) => {
    const callerSocket = userSocketMap[toUserId];
    if (callerSocket) io.to(callerSocket).emit("call:busy");
  });

  socket.on("call:offer", ({ toUserId, sdp }) => {
    const peer = userSocketMap[toUserId];
    if (peer) io.to(peer).emit("call:offer", { sdp });
  });

  socket.on("call:answer", ({ toUserId, sdp }) => {
    const peer = userSocketMap[toUserId];
    if (peer) io.to(peer).emit("call:answer", { sdp });
  });

  socket.on("call:candidate", ({ toUserId, candidate }) => {
    const peer = userSocketMap[toUserId];
    if (peer) io.to(peer).emit("call:candidate", { candidate });
  });

  socket.on("call:end", ({ toUserId }) => {
    const peer = userSocketMap[toUserId];
    if (peer) io.to(peer).emit("call:ended");
    socket.emit("call:ended");
  });
  // ✅ -------------------------------

  socket.on("disconnect", () => {
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUser", Object.keys(userSocketMap));
  });
});

// ✅ Updated CORS for API routes
app.use(express.json({ limit: "4mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:5173", // local dev
      "https://chat-application-sepia-psi.vercel.app", // deployed frontend
    ],
    credentials: true,
  })
);

app.get("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", UserRouter);
app.use("/api/messages", messageRouter);

await connectDB();

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log("Server is running on PORT: " + PORT));
}

// export server for vercel
export default server;
