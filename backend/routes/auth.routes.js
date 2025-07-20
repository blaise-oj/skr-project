import express from "express";
import { 
  registerAdmin, 
  loginAdmin,
  registerUser,
  loginUser,
  verifyEmail,
  forgotPassword,  
  resetPassword
} from "../controllers/auth.controller.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js"; // New middleware
import User from "../models/user.model.js"; // Import User model for email verification


const router = express.Router();

// Public routes (for regular users)
router.post("/register", registerUser); // Regular user registration
router.get("/verify-email", verifyEmail);

router.post("/forgot-password", forgotPassword);  
router.post("/reset-password", resetPassword); 

router.post("/user-login", loginUser);   // for regular users
router.post("/admin-login", loginAdmin); // for admins only  

// Protected admin routes
router.post("/admin/register", verifyAdmin, registerAdmin); // Admin-only registration

export default router;