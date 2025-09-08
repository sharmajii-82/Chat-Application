// client/context/ChatContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [allMessages, setAllMessages] = useState({}); // { [userId]: Message[] }
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({}); // { [userId]: number }

  const { socket, axios, authUser } = useContext(AuthContext);

  // Helpers to update message inside allMessages
  const _upsertMessage = (updatedMsg) => {
    // normalized conversation key
    const otherId =
      String(updatedMsg.senderId) === String(authUser._id)
        ? String(updatedMsg.receiverId)
        : String(updatedMsg.senderId);

    setAllMessages((prev) => {
      const prevConv = prev[otherId] || [];
      // if exists, replace; else append
      const found = prevConv.some((m) => String(m._id) === String(updatedMsg._id));
      return {
        ...prev,
        [otherId]: found
          ? prevConv.map((m) => (String(m._id) === String(updatedMsg._id) ? updatedMsg : m))
          : [...prevConv, updatedMsg],
      };
    });
  };

  const _removeMessageLocally = (messageId) => {
    setAllMessages((prev) => {
      const updated = {};
      for (const k of Object.keys(prev)) {
        updated[k] = prev[k].filter((m) => String(m._id) !== String(messageId));
      }
      return updated;
    });
  };

  // Reset unseen count in UI
  const resetUnseenMessages = (userId) => {
    setUnseenMessages((p) => ({ ...p, [userId]: 0 }));
  };

  // mark entire conversation as seen (server persists)
  const markConversationSeen = async (otherUserId) => {
    try {
      await axios.put(`/api/messages/mark-conversation/${otherUserId}`);
      resetUnseenMessages(otherUserId);
    } catch (err) {
      // ignore if fail — UI is optimistic
      console.error("markConversationSeen failed:", err?.message || err);
    }
  };

  // FETCH: users (sidebar) + unseen counts
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users || []);
        // server returns unseenMessages map
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch users");
    }
  };

  // FETCH: conversation messages
  const getMessages = async (userId) => {
    if (!userId) return;
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setAllMessages((prev) => ({ ...prev, [userId]: data.messages || [] }));
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch messages");
    }
  };

  // SEND a message (HTTP) -> server will emit to receiver
  const sendMessage = async (messageData) => {
    if (!selectedUser) return;
    try {
      const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData);
      if (data.success) {
        // add locally
        setAllMessages((prev) => ({
          ...prev,
          [selectedUser._id]: [...(prev[selectedUser._id] || []), data.newMessage],
        }));
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    }
  };

  // EDIT a message (only allowed for sender). Server returns updated message.
  const editMessage = async (messageId, newText) => {
    try {
      const { data } = await axios.put(`/api/messages/edit/${messageId}`, { text: newText });
      if (data.success && data.message) {
        _upsertMessage(data.message);
      } else {
        toast.error(data.message || "Failed to edit message");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to edit message");
    }
  };

  // DELETE message: forEveryone=true marks message deleted on server (both see placeholder).
  // forEveryone=false removes it locally for this user only.
  const deleteMessage = async (messageId, forEveryone = true) => {
    try {
      // axios.delete with request body needs { data: {...} }
      const { data } = await axios.delete(`/api/messages/delete/${messageId}`, {
        data: { forEveryone },
      });

      if (data.success) {
        if (forEveryone) {
          // server returns updated message with deleted:true
          _upsertMessage(data.message);
        } else {
          // delete for me: remove locally
          _removeMessageLocally(messageId);
        }
      } else {
        toast.error(data.message || "Failed to delete message");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete message");
    }
  };

  // socket listeners — keep UI in sync when other party edits/deletes/sees
  useEffect(() => {
    if (!socket || !authUser) return;

    const handleNewMessage = (newMessage) => {
      const otherId =
        String(newMessage.senderId) === String(authUser._id)
          ? String(newMessage.receiverId)
          : String(newMessage.senderId);

      setAllMessages((prev) => ({
        ...prev,
        [otherId]: [...(prev[otherId] || []), newMessage],
      }));

      if (selectedUser?._id === otherId) {
        // if chat open, mark as seen on server
        markConversationSeen(otherId);
      } else if (String(newMessage.senderId) !== String(authUser._id)) {
        // increment unseen
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: (prev[newMessage.senderId] || 0) + 1,
        }));
      }
    };

    const handleMessageEdited = (msg) => {
      _upsertMessage(msg);
    };

    const handleMessageDeleted = (msg) => {
      // server sends the message doc with deleted: true (and cleared text/image)
      _upsertMessage(msg);
    };

    const handleMessagesSeen = ({ byUserId, otherId, messageIds }) => {
      // mark those message ids as seen
      const convKey = String(byUserId) === String(authUser._id) ? String(otherId) : String(byUserId);
      setAllMessages((prev) => ({
        ...prev,
        [convKey]: (prev[convKey] || []).map((m) =>
          messageIds.includes(String(m._id)) ? { ...m, seen: true } : m
        ),
      }));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messagesSeen", handleMessagesSeen);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messagesSeen", handleMessagesSeen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, authUser, selectedUser]);

  // when selecting user => fetch messages and mark seen on server (persisted)
  useEffect(() => {
    if (!selectedUser) return;
    getMessages(selectedUser._id);
    markConversationSeen(selectedUser._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  return (
    <ChatContext.Provider
      value={{
        allMessages,
        selectedUser,
        setSelectedUser,
        users,
        getUsers,
        getMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        unseenMessages,
        setUnseenMessages,
        resetUnseenMessages,
        markConversationSeen,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
