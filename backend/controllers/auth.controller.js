import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import crypto from "crypto"; // for generating random verification tokens
import nodemailer from "nodemailer"; // for sending the verification email
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = "skr-admin-secret"; // Put in .env in production

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create new user (unverified)
    const user = new User({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
      verificationToken,
    });

    await user.save();

    // Send verification email
    const transporter = nodemailer.createTransport({
      service: "Gmail", // or use your email provider (e.g., Mailgun, Outlook)
      auth: {
        user: process.env.EMAIL_USER, // stored in your .env file
        pass: process.env.EMAIL_PASS,
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
      to: email,
      subject: "Verify Your Email - Gordon Security",
      html: `<h2>Verify Your Email</h2><p>Click the link below to verify your email:</p><a href="${verifyUrl}">Verify Email</a>`,
    });

    res.status(201).json({
      message: "User registered. Please check your email to verify your account.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error: " + err.message });
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


