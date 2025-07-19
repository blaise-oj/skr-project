import express from "express";
import { 
  registerAdmin, 
  loginAdmin,
  registerUser 
} from "../controllers/auth.controller.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js"; // New middleware
import User from "../models/user.model.js"; // Import User model for email verification

const router = express.Router();

// Public routes (for regular users)
router.post("/register", registerUser); // Regular user registration
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  const user = await User.findOne({ verificationToken: token });

  if (!user) {
    return res.status(400).send("Invalid or expired token");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  res.send("Email verified successfully. You can now log in.");
});

router.post("/login", loginAdmin); // Shared login endpoint

// Protected admin routes
router.post("/admin/register", verifyAdmin, registerAdmin); // Admin-only registration

export default router;