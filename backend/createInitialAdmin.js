import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "./models/admin.model.js";

const run = async () => {
  try {
    await mongoose.connect("mongodb+srv://blaise_oj:oaIeDfDDsdQUI2HV@cluster1.jygtton.mongodb.net/skr?retryWrites=true&w=majority", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const hashed = await bcrypt.hash("admin123", 10);

    const newAdmin = new Admin({
      username: "superadmin",
      email: "admin@gordonsecurity.com",
      password: hashed,
      isAdmin: true
    });

    await newAdmin.save();
    console.log("Initial admin created successfully ✅");
    process.exit();
  } catch (err) {
    console.error("Failed to create initial admin ❌:", err.message);
    process.exit(1);
  }
};

run();
