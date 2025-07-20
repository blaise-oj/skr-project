import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },
}, { timestamps: true });
// Add index for better performance on token searches
userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

export default mongoose.model("User", userSchema);
