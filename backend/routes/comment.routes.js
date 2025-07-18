// routes/comment.routes.js
import express from "express";
import Comment from "../models/comment.model.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// Public: Post a new comment
router.post("/", async (req, res) => {
  try {
    const { name, email, comment } = req.body;
    const newComment = new Comment({ name, email, comment });
    await newComment.save();
    res.status(201).json({ message: "Comment posted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to post comment" });
  }
});

// Admin only: Get all comments
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const comments = await Comment.find().sort({ datePosted: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

export default router;

