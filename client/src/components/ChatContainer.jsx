import React, { useEffect, useRef, useContext, useState } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { CallContext } from "../../context/CallContext";
import toast from "react-hot-toast";

const EMOJIS = ["😀", "😂", "😊", "❤️", "👍", "😮", "😢", "🙏", "🎉", "🔥"];

const ChatContainer = () => {
  const {
    allMessages,
    selectedUser,
    sendMessage,
    getMessages,
    editMessage,
    deleteMessage,
  } = useContext(ChatContext);

  const { authUser, onlineUsers } = useContext(AuthContext);

  const {
    callState,
    callType,
    currentCall,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useContext(CallContext);

  const incomingCall = callState === "ringing" && currentCall?.fromUser;
  const inCall = callState === "in-call";

  const scrollEnd = useRef();
  const [input, setInput] = useState("");
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openEmojiForMessageId, setOpenEmojiForMessageId] = useState(null);

  const messages = selectedUser ? allMessages[selectedUser._id] || [] : [];

  // ✅ Video Refs
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  useEffect(() => {
    if (selectedUser) getMessages(selectedUser._id);
    setOpenMenuId(null);
    setOpenEmojiForMessageId(null);
  }, [selectedUser]);

  useEffect(() => {
    if (scrollEnd.current) {
      setTimeout(() => {
        scrollEnd.current.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleEditStart = (msg) => {
    setEditingMsgId(msg._id);
    setEditText(msg.text || "");
    setOpenMenuId(null);
  };

  const handleSaveEdit = async (msgId) => {
    if (!editText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }
    await editMessage(msgId, editText.trim());
    setEditingMsgId(null);
    setEditText("");
  };

  const handleDelete = async (msgId, forEveryone) => {
    const confirmText = forEveryone
      ? "Delete for everyone? This will replace message with 'Message deleted' for both users."
      : "Delete for you? This will remove the message only from your view.";
    if (!window.confirm(confirmText)) return;

    await deleteMessage(msgId, forEveryone);
    setOpenMenuId(null);
    setOpenEmojiForMessageId(null);
    if (editingMsgId === msgId) {
      setEditingMsgId(null);
      setEditText("");
    }
  };

  const toggleMenu = (msgId, e) => {
    e.stopPropagation();
    setOpenEmojiForMessageId(null);
    setOpenMenuId((prev) => (prev === msgId ? null : msgId));
  };

  const toggleEmojiPicker = (msgId, e) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setOpenEmojiForMessageId((prev) => (prev === msgId ? null : msgId));
  };

  const handleEmojiClick = (emoji, msgId, e) => {
    e.stopPropagation();
    if (editingMsgId === msgId) {
      setEditText((t) => `${t}${emoji}`);
    } else {
      setInput((t) => `${t}${emoji}`);
    }
  };

  return selectedUser ? (
    <div
      className="h-full relative bg-gray-900/70 backdrop-blur-md overflow-hidden"
      onClick={() => {
        setOpenMenuId(null);
        setOpenEmojiForMessageId(null);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-4 border-b border-stone-500">
        <div className="flex items-center gap-3">
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            alt="avatar"
            className="w-9 h-9 rounded-full border border-gray-600 shadow-md"
          />
          <div className="flex flex-col">
            <p className="text-white text-base font-semibold">
              {selectedUser?.fullName}
            </p>
            <span
              className={`text-xs ${
                onlineUsers?.includes(selectedUser?._id)
                  ? "text-green-400"
                  : "text-gray-400"
              }`}
            >
              {onlineUsers?.includes(selectedUser?._id) ? "online" : "offline"}
            </span>
          </div>
        </div>

        {/* Call buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => startCall("audio", selectedUser)}
            title="Audio Call"
            className="text-white hover:text-green-400"
          >
            📞
          </button>
          <button
            onClick={() => startCall("video", selectedUser)}
            title="Video Call"
            className="text-white hover:text-blue-400"
          >
            🎥
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col h-[calc(100%-120px)] overflow-y-auto p-3 pb-24 space-y-3 custom-scrollbar">
        {messages.map((msg) => {
          const isSender = String(msg.senderId) === String(authUser?._id);
          const isEditing = editingMsgId === msg._id;
          const menuOpen = openMenuId === msg._id;
          const emojiOpen = openEmojiForMessageId === msg._id;

          return (
            <div
              key={msg._id}
              className={`flex flex-col ${
                isSender ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-end gap-2 relative">
                {!isSender && (
                  <img
                    src={selectedUser?.profilePic || assets.avatar_icon}
                    alt="user"
                    className="w-7 h-7 rounded-full border border-gray-600"
                  />
                )}

                {/* message content */}
                {isEditing ? (
                  <div className="bg-gray-700 px-2 py-1 rounded-lg max-w-[260px] flex items-center gap-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="bg-transparent outline-none text-white flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(msg._id)}
                      className="text-sm text-green-400"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingMsgId(null);
                        setEditText("");
                      }}
                      className="text-sm text-red-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : msg.image ? (
                  <img
                    src={msg.image}
                    alt="sent"
                    className="max-w-[240px] rounded-xl border border-gray-700 hover:opacity-90 transition"
                  />
                ) : (
                  <p
                    className={`px-3 py-2 max-w-[230px] text-sm font-light rounded-2xl break-words text-white shadow-md ${
                      isSender
                        ? "bg-violet-500/80 rounded-br-none"
                        : "bg-gray-700/70 rounded-bl-none"
                    }`}
                  >
                    {msg.deleted ? (
                      <span className="italic text-gray-400">
                        Message deleted
                      </span>
                    ) : (
                      <>
                        {msg.text}
                        {msg.edited && !msg.deleted && (
                          <span className="text-[10px] text-gray-300 ml-2">
                            (edited)
                          </span>
                        )}
                      </>
                    )}
                  </p>
                )}

                {isSender && (
                  <img
                    src={authUser?.profilePic || assets.avatar_icon}
                    alt="me"
                    className="w-7 h-7 rounded-full border border-gray-600"
                  />
                )}

                {/* menu toggle */}
                {!isEditing && isSender && (
                  <button
                    onClick={(e) => toggleMenu(msg._id, e)}
                    className="ml-2 text-xs text-gray-300"
                    title="Options"
                  >
                    ⋮
                  </button>
                )}

                {/* Menu dropdown */}
                {menuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-8 right-0 bg-[#1f2937] text-white rounded-md shadow p-2 z-30"
                  >
                    <button
                      onClick={() => {
                        handleEditStart(msg);
                      }}
                      className="block text-sm px-2 py-1 hover:bg-gray-800 w-full text-left"
                    >
                      Edit
                    </button>
                    {/* ✅ FIXED HERE: pass real event */}
                    <button
                      onClick={(e) => toggleEmojiPicker(msg._id, e)}
                      className="block text-sm px-2 py-1 hover:bg-gray-800 w-full text-left"
                    >
                      Emoji
                    </button>
                    <hr className="my-1 border-t border-gray-600" />
                    <button
                      onClick={() => handleDelete(msg._id, false)}
                      className="block text-sm px-2 py-1 hover:bg-gray-800 w-full text-left text-yellow-200"
                    >
                      Delete for me
                    </button>
                    <button
                      onClick={() => handleDelete(msg._id, true)}
                      className="block text-sm px-2 py-1 hover:bg-gray-800 w-full text-left text-red-400"
                    >
                      Delete for everyone
                    </button>
                  </div>
                )}

                {/* Emoji picker dropdown */}
                {emojiOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-12 right-0 bg-[#111827] p-2 rounded-md z-30 grid grid-cols-5 gap-1"
                  >
                    {EMOJIS.map((emj) => (
                      <button
                        key={emj}
                        onClick={(e) => handleEmojiClick(emj, msg._id, e)}
                        className="text-xl leading-none"
                      >
                        {emj}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* time + ticks */}
              <div className="flex items-center gap-1 mt-1">
                <p className="text-[10px] text-gray-400">
                  {msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
                {isSender && !msg.deleted && (
                  <span
                    className={`text-[11px] ml-1 ${
                      msg.seen
                        ? "text-blue-400"
                        : msg.delivered
                        ? "text-gray-300"
                        : "text-gray-400"
                    }`}
                  >
                    {msg.seen ? "✔✔" : msg.delivered ? "✔✔" : "✔"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollEnd} />
      </div>

      {/* Input box */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3 bg-gray-800/80 backdrop-blur-sm shadow-inner">
        <div className="flex-1 flex items-center bg-gray-700/40 px-3 py-2 rounded-full shadow-md">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
            type="text"
            placeholder="Send a message..."
            className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none border-none px-2 py-1"
          />
          <input
            onChange={handleSendImage}
            type="file"
            id="image"
            accept="image/png, image/jpeg"
            hidden
          />
          <label htmlFor="image" className="cursor-pointer">
            <img src={assets.gallery_icon} alt="upload" className="w-5 ml-2" />
          </label>
        </div>
        <img
          onClick={(e) => handleSendMessage(e)}
          src={assets.send_button}
          alt="send"
          className="w-7 cursor-pointer hover:scale-110 transition"
        />
      </div>

      {/* Incoming Call Popup */}
      {incomingCall && !inCall && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
          <p className="text-white mb-4">
            {currentCall.fromUser.fullName} is calling ({currentCall.callType})...
          </p>
          <div className="flex gap-4">
            <button
              onClick={acceptCall}
              className="bg-green-500 px-4 py-2 rounded-lg"
            >
              Accept
            </button>
            <button
              onClick={rejectCall}
              className="bg-red-500 px-4 py-2 rounded-lg"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Call Panel */}
      {inCall && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          {callType === "video" && (
            <div className="relative w-full h-full flex">
              {/* ✅ FIXED binding */}
              <video
                autoPlay
                playsInline
                ref={remoteVideoRef}
                className="w-full h-full object-cover"
              />
              <video
                autoPlay
                playsInline
                muted
                ref={localVideoRef}
                className="absolute bottom-4 right-4 w-40 h-32 rounded-lg border-2 border-white shadow-lg"
              />
            </div>
          )}
          {callType === "audio" && (
            <p className="text-white text-xl">On Audio Call...</p>
          )}

          {/* Controls */}
          <div className="absolute bottom-6 flex gap-6">
            <button
              onClick={toggleMute}
              className="bg-gray-700 px-4 py-2 rounded-full text-white"
            >
              🎤
            </button>
            {callType === "video" && (
              <button
                onClick={toggleCamera}
                className="bg-gray-700 px-4 py-2 rounded-full text-white"
              >
                📷
              </button>
            )}
            <button
              onClick={endCall}
              className="bg-red-600 px-6 py-2 rounded-full text-white"
            >
              End Call
            </button>
          </div>
        </div>
      )}

      {/* Custom scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #6b21a8; border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center space-y-3 h-full bg-gray-900/50 backdrop-blur-md text-gray-400">
      <img
        src={assets.logo_icon}
        className="w-16 h-16 object-contain"
        alt="Logo"
      />
      <p className="text-lg font-medium text-white">
        Chat anytime, anywhere
      </p>
    </div>
  );
};

export default ChatContainer;
