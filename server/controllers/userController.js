import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const Signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;
  try {
    if (!fullName || !email || !password || !bio) {
      return res.json({ success: false, message: "Missing details" });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.json({ success: false, message: "Account already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({ fullName, email, password: hashedPassword, bio });

    const token = generateToken(newUser._id);
    res.json({
      success: true,
      userData: newUser,                 // ✅ correct key
      token,
      message: "Account created successfully"
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });
    if (!userData) return res.json({ success: false, message: "User not found" });

    const ok = await bcrypt.compare(password, userData.password);
    if (!ok) return res.json({ success: false, message: "Invalid credentials" });

    const token = generateToken(userData._id);
    res.json({ success: true, userData, token, message: "Login successful" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const checkAuth = (req, res) => {
  res.json({ success: true, user: req.user });
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;

    let update = { bio, fullName };
    if (profilePic) {
      const upload = await cloudinary.uploader.upload(profilePic);
      update.profilePic = upload.secure_url;
    }
    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
