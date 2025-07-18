// models/comment.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  comment: { type: String, required: true },
  datePosted: { type: Date, default: Date.now }
});

export default mongoose.model("Comment", commentSchema);

