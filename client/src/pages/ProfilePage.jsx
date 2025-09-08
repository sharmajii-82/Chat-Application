import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);

  const [selectedImg, setSelectedImg] = useState(null);
  const [name, setName] = useState(authUser?.fullName || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let profilePic = authUser?.profilePic;

      if (selectedImg) {
        // convert image -> base64
        profilePic = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedImg);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      }

      await updateProfile({ profilePic, fullName: name, bio });
      toast.success("Profile updated successfully!");
      navigate("/");
    } catch (err) {
      console.error("Profile update failed:", err);
      toast.error("Failed to update profile!");
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-no-repeat flex items-center justify-center">
      <div className="w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2 border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg p-6">
        {/* Profile Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 flex-1"
        >
          <h3 className="text-xl font-medium">Profile Details</h3>

          {/* Upload avatar */}
          <label
            htmlFor="avatar"
            className="flex items-center gap-3 cursor-pointer"
          >
            <input
              onChange={(e) => setSelectedImg(e.target.files[0])}
              type="file"
              id="avatar"
              accept=".png, .jpg, .jpeg"
              hidden
            />
            <img
              src={
                selectedImg
                  ? URL.createObjectURL(selectedImg)
                  : authUser?.profilePic || assets.avatar_icon
              }
              alt="avatar"
              className="w-12 h-12 rounded-full border border-gray-500 object-cover"
            />
            <span className="text-sm text-gray-400">
              Upload profile image
            </span>
          </label>

          {/* Name input */}
          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            type="text"
            required
            placeholder="Your name"
            className="p-2 border border-gray-500 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          {/* Bio input */}
          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            placeholder="Write profile bio"
            required
            className="p-2 border border-gray-500 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500"
            rows={4}
          ></textarea>

          {/* Save button */}
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-400 to-violet-600 text-white py-2 rounded-md text-lg cursor-pointer font-medium"
          >
            Save Changes
          </button>
        </form>

        {/* Profile Preview */}
        <div className="flex justify-center items-center max-sm:mb-6">
          <img
            className="w-40 h-40 rounded-full border-4 border-violet-500 object-cover"
            src={
              selectedImg
                ? URL.createObjectURL(selectedImg)
                : authUser?.profilePic || assets.logo_icon
            }
            alt="profile-preview"
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
