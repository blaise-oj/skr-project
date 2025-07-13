import Admin from "../models/admin.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = "skr-admin-secret"; // Put in .env in production

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashed
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
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


