import express from "express";
import { checkAuth, login, Signup, updateProfile } from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";

const UserRouter = express.Router();

UserRouter.post("/signup", Signup);
UserRouter.post("/login", login);
UserRouter.put("/update-profile", protectRoute, updateProfile);
UserRouter.get("/check", protectRoute, checkAuth);

export default UserRouter;
