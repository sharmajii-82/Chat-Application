import React, { useContext } from "react";
import assets, { imagesDummyData } from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";

const RightSidebar = ({ selectedUser }) => {
  const { onlineUsers } = useContext(AuthContext);
  const isOnline = selectedUser && onlineUsers?.includes(selectedUser._id);

  if (!selectedUser) return null;

  return (
    <div className="flex-1 bg-gray-900/70 backdrop-blur-md border-l border-white/10 p-6 flex flex-col">
      {/* Profile Info */}
      <div className="flex flex-col items-center">
        <img
          src={selectedUser?.profilePic || assets.avatar_icon}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-md"
        />

        {/* Name + Status */}
        <div className="flex items-center gap-2 mt-4">
          <span
            className={`w-3 h-3 rounded-full ${
              isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          ></span>
          <h1 className="text-lg font-bold text-white">{selectedUser.fullName}</h1>
        </div>

        <p className="text-sm text-gray-400 mt-1">{isOnline ? "Online" : "Offline"}</p>

        {/* Bio */}
        <p className="mt-2 text-sm text-gray-300 italic text-center">
          {selectedUser.bio || "Hi Everyone, I am using QuickChat"}
        </p>
      </div>

      {/* Divider */}
      <hr className="border-[#ffffff20] my-6" />

      {/* Shared Media */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-white font-semibold mb-3">Shared Media</p>
        <div className="grid grid-cols-3 gap-3">
          {imagesDummyData.map((url, index) => (
            <div
              key={index}
              onClick={() => window.open(url, "_blank")}
              className="cursor-pointer rounded overflow-hidden hover:opacity-90 transition"
            >
              <img
                src={url}
                alt={`media-${index}`}
                className="w-full h-20 object-cover rounded-lg border border-gray-600"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <div className="mt-6">
        <button className="w-full bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-2 rounded-xl shadow-md hover:opacity-90 transition">
          Logout
        </button>
      </div>
    </div>
  );
};

export default RightSidebar;
