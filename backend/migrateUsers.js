import mongoose from "mongoose";
import Admin from "./models/admin.model.js";
import User from "./models/user.model.js";

const runMigration = async () => {
  try {
    await mongoose.connect("mongodb+srv://blaise_oj:FPIBncVZPq9mnG0F@cluster1.jygtton.mongodb.net/skr?retryWrites=true&w=majority");
    console.log("Connected to DB");

    const users = await Admin.find({ isAdmin: false });

    for (const u of users) {
      if (!u.email) {
        console.warn(`Skipping user without email: ${u.username}`);
        continue;
      }

      await User.create({
        username: u.username,
        email: u.email,
        password: u.password
      });

      await Admin.deleteOne({ _id: u._id });
    }

    console.log("User migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

runMigration();
