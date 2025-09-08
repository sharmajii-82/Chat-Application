import React, { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";

const Sidebar = () => {
  const {
    getUsers,
    users = [],
    selectedUser,
    setSelectedUser,
    unseenMessages = {},
    resetUnseenMessages = () => {}, // ✅ fallback function
  } = useContext(ChatContext);

  const { logout, onlineUsers = [] } = useContext(AuthContext);
  const [searchInput, setSearchInput] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getUsers?.();
  }, [onlineUsers]);

  const filteredUsers = searchInput
    ? users.filter((u) =>
        u.fullName?.toLowerCase().includes(searchInput.toLowerCase())
      )
    : users;

  const handleUserClick = (user) => {
    setSelectedUser(user);
    resetUnseenMessages(user._id); // ✅ no error now
  };

  return (
    <div
      className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white custom-scrollbar ${
        selectedUser ? "max-md:hidden" : ""
      }`}
    >
      {/* Header */}
      <div className="pb-5">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="max-w-48" />
          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="Menu"
              className="max-h-5 cursor-pointer"
            />
            <div className="absolute top-full right-0 z-20 w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm"
              >
                Edit Profile
              </p>
              <hr className="my-2 border-t border-gray-500" />
              <p onClick={logout} className="cursor-pointer text-sm">
                Logout
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5">
          <img src={assets.search_icon} alt="Search" className="w-3" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search User..."
            className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8cB] flex-1"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {filteredUsers.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-4">
            No users found
          </p>
        )}

        {filteredUsers.map((user) => {
          const isOnline = onlineUsers.includes(user._id);
          const unseenCount = unseenMessages[user._id] || 0;

          return (
            <div
              key={user._id}
              onClick={() => handleUserClick(user)}
              className={`relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[#282142]/40 ${
                selectedUser?._id === user._id ? "bg-[#282142]/60" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={user.profilePic || assets.avatar_icon}
                    alt="User"
                    className="w-[42px] h-[42px] rounded-full object-cover border border-gray-600 shadow-md"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e1e2f] ${
                      isOnline ? "bg-green-400" : "bg-red-500"
                    }`}
                  />
                </div>
                <p className="text-sm font-medium">
                  {user.fullName || "Unknown"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {unseenCount > 0 && (
                  <span className="bg-violet-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                    {unseenCount}
                  </span>
                )}
                <span
                  className={`text-xs font-semibold ${
                    isOnline ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Scrollbar */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #6d28d9; border-radius: 9999px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        `}
      </style>
    </div>
  );
};

export default Sidebar;
