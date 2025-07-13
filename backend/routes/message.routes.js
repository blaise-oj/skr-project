import express from "express";
import Message from "../models/message.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// Create new message (public)
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const newMessage = new Message({ name, email, subject, message });
    await newMessage.save();
    res.status(201).json({ message: "Message sent successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

// Get all messages (admin only)
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const messages = await Message.find().sort({ dateSent: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

export default router;
