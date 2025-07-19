import express from "express";
import { 
  registerAdmin, 
  loginAdmin,
  registerUser 
} from "../controllers/auth.controller.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js"; // New middleware
import User from "../models/user.model.js"; // Import User model for email verification
import { verifyEmail } from "../controllers/auth.controller.js";

const router = express.Router();

// Public routes (for regular users)
router.post("/register", registerUser); // Regular user registration
router.get("/verify-email", verifyEmail);


router.post("/login", loginAdmin); // Shared login endpoint

// Protected admin routes
router.post("/admin/register", verifyAdmin, registerAdmin); // Admin-only registration

export default router;