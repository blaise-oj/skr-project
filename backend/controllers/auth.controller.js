import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Brevo from "@getbrevo/brevo";

const SECRET = process.env.JWT_SECRET || "skr-admin-secret";

// Initialize Brevo client
const brevo = new Brevo.TransactionalEmailsApi();
brevo.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// HTML templates
const emailTemplates = {
  verification: (verifyUrl) => `
    <div style="font-family:sans-serif; text-align:center;">
      <h2>Verify Your Email - Gordon Security</h2>
      <p>Click below to verify your email:</p>
      <a href="${verifyUrl}" style="display:inline-block; padding:10px 20px; background:#007bff; color:white; border-radius:5px; text-decoration:none;">Verify Email</a>
      <p>If you didn't request this, ignore this email.</p>
    </div>
  `,
  passwordReset: (resetUrl) => `
    <div style="font-family:sans-serif; text-align:center;">
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click below to continue:</p>
      <a href="${resetUrl}" style="display:inline-block; padding:10px 20px; background:#007bff; color:white; border-radius:5px; text-decoration:none;">Reset Password</a>
      <p>This link expires in 24 hours. If you didn't request this, ignore this email.</p>
    </div>
  `
};

// Send email via Brevo
const sendEmail = async (to, subject, html) => {
  try {
    await brevo.sendTransacEmail({
      sender: { email: process.env.EMAIL_USER, name: "Gordon Security" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });
  } catch (err) {
    console.error("Email sending error:", err);
    throw new Error("Failed to send email");
  }
};

// ============================= USER AUTH =============================

// Register User
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      isVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    await user.save();

    const verifyUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${verificationToken}`;
    await sendEmail(email, "Verify Your Email - Gordon Security", emailTemplates.verification(verifyUrl));

    res.status(201).json({ message: "User registered. Check your email to verify your account." });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// Verify Email
export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.send(`<h2>Invalid or missing token</h2>`);

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) return res.send(`<h2>Invalid or expired verification link</h2>`);

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

// Login User
export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Verify your email before logging in." });
    }

    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, isAdmin: false }, SECRET, { expiresIn: "1d" });

    res.json({ token, user: { username: user.username, email: user.email } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
      await sendEmail(email, "Password Reset - Gordon Security", emailTemplates.passwordReset(resetUrl));
    }
    res.status(200).json({ message: "If this email exists, a reset link has been sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Error processing request" });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token." });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
};

// ============================= ADMIN AUTH =============================

// Register Admin
export const registerAdmin = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ username, email, password: hashedPassword, isAdmin: true });
    await admin.save();

    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    console.error("Register admin error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Login Admin
export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    let user = await Admin.findOne({ username });
    let isAdmin = true;

    if (!user) {
      user = await User.findOne({ username });
      isAdmin = false;
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, username: user.username, isAdmin }, SECRET, { expiresIn: "1d" });

    res.json({ token, user: { username: user.username, isAdmin } });
  } catch (err) {
    console.error("Login admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



