import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true,
    // Remove unique: true here to allow duplicates in frontend
  },
  password: { type: String, required: true },
  // Added new field to distinguish admin vs regular users
  isAdmin: { 
    type: Boolean, 
    default: false,
    index: true // For faster querying
  }
}, { timestamps: true });

// Add compound unique index ONLY for admin users
adminSchema.index(
  { username: 1, isAdmin: 1 }, 
  { unique: true, partialFilterExpression: { isAdmin: true } }
);

export default mongoose.model("Admin", adminSchema);
