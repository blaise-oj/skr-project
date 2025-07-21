import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = "skr-admin-secret"; // Put in .env in production

// Email transporter setup (shared for all emails)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email templates
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

// Shared email sender
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

// Controllers
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if email exists
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Create user
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      isVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 86400000 // 24 hours
    });

    await user.save();

    // Send verification email
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

export const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.send(`<h2>Invalid or missing token</h2>`);
  }

  try {
    const user = await User.findOne({ 
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.send(`<h2>Invalid or expired verification link</h2>`);
    }

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

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first." });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: false },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user: { username: user.username } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();
      
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


