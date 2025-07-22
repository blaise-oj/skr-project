import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import crypto from "crypto"; // For generating secure tokens
import nodemailer from "nodemailer"; // For sending email
import bcrypt from "bcryptjs"; // For password hashing
import jwt from "jsonwebtoken";// For generating login tokens

const SECRET = "skr-admin-secret"; // move to .env for production use

// Email transporter using Gmail (credentials from .env)   
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Reusable HTML templates for verification and password reset emails
const emailTemplates = {
  verification: (verifyUrl) => `
    <div style="font-family:sans-serif; text-align:center;">
      <h2>Verify Your Email - Gordon Security</h2>
      <p>Click below to verify your email:</p>
      <a href="${verifyUrl}" 
         style="display:inline-block; padding:10px 20px; background:#007bff; color:white; border-radius:5px; text-decoration:none;">
         Verify Email
      </a>
      <p>If you didn't request this, ignore this email.</p>
    </div>
  `,
  passwordReset: (resetUrl) => `
    <div style="font-family:sans-serif; text-align:center;">
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click below to continue:</p>
      <a href="${resetUrl}" 
         style="display:inline-block; padding:10px 20px; background:#007bff; color:white; border-radius:5px; text-decoration:none;">
         Reset Password
      </a>
      <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    </div>
  `
};
// Sends an email using nodemailer
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"Gordon Security" <no-reply@gordonsecurity.com>',
      to,
      subject,
      html
    });
  } catch (err) {
    console.error("Email sending error:", err);
    throw new Error("Failed to send email");
  }
};


export const registerUser = async (req, res) => {

  try {
    const { username, email, password } = req.body;

     // 1. Reject duplicate emails
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // 2. Create verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    // 3. Create user record (unverified initially)
    const user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      isVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 86400000 // 24 hours
    });

    await user.save();

    // 4. Send verification email with token link
    const verifyUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${verificationToken}`;
    await sendEmail(
      email,
      "Verify Your Email - Gordon Security Company",
      emailTemplates.verification(verifyUrl)
    );

    res.status(201).json({
      message: "User registered. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};
// Verifies email using token from query params
export const verifyEmail = async (req, res) => {
  
  const { token } = req.query;

  if (!token) {
    return res.send(`<h2>Invalid or missing token</h2>`);
  }

  try {
     // 1. Find unexpired token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.send(`<h2>Invalid or expired verification link</h2>`);
    }
    // 2. Mark user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return res.send(`
      <div style="text-align:center; font-family:sans-serif;">
        <h2>✅ Email verified successfully!</h2>
        <p>You can now <a href="${process.env.FRONTEND_URL}/login.html">log in</a>.</p>
      </div>
    `);
  } catch (err) {
    console.error("Verification error:", err);
    return res.send(`<h2>Error verifying email</h2>`);
  }
};
// Login for users (requires verified email)
export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body; // Accept either username or email
    // Accept username or email as login identifier
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });
    // 1. Validate user and password
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // 2. Ensure email is verified
    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first." });
    }
    // 3. Issue JWT token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: false,
      },
      SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Return both username and email
    res.json({ token, user: { username: user.username, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Request password reset link (even if email doesn't exist, don't reveal that)
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // 1. Generate token and expiry
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000 * 24; // 24 hours
      await user.save();
      
      // 2. Send reset link
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
      await sendEmail(
        user.email,
        "Password Reset - Gordon Security Company",
        emailTemplates.passwordReset(resetUrl)
      );
    }

    // Always return success to prevent email enumeration
    res.status(200).json({
      message: "If this email exists, a reset link has been sent"
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Error processing request" });
  }
};

export const resetPassword = async (req, res) => {
  // 1. Find user by reset token (and check not expired)
  // 2. Hash and update password
  // 3. Clear reset fields
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired token. Please request a new reset link."
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: "Password updated successfully. You can now login with your new password."
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
};


// auth.controller.js
export const registerAdmin = async (req, res) => {
  // 1. Validate password
  // 2. Hash password
  // 3. Create and save new admin user
  try {
    const { username, password, email } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = new Admin({
      username,
      email,
      password: hashed,
      isAdmin: true
    });

    await admin.save();
    res.status(201).json({ message: "Admin created successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const loginAdmin = async (req, res) => {
  // 1. Try to find by Admin model
  // 2. If not found, fall back to User model
  // 3. Check password
  // 4. Return JWT with isAdmin flag
  const { username, password } = req.body;

  // First check Admins
  let user = await Admin.findOne({ username });
  let isAdmin = true;

  // If not found in Admins, check Users
  if (!user) {
    user = await User.findOne({ username });
    isAdmin = false;
  }

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, username: user.username, isAdmin },
    SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    user: {
      username: user.username,
      isAdmin
    }
  });
};


