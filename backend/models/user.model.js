import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },

  // Email verification fields
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },

  // 🔧 Password reset fields (add these!)
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }

}, { timestamps: true });

// Indexing for faster lookup
userSchema.index({ verificationToken: 1 });
userSchema.index({ resetPasswordToken: 1 });

export default mongoose.model("User", userSchema);

