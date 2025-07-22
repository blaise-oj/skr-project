import dotenv from "dotenv";
dotenv.config();
console.log("BACKEND_URL:", process.env.BACKEND_URL);

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import receipt from "./models/receipt.model.js";
import receiptRoutes from "./routes/receipt.route.js";
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import commentRoutes from "./routes/comment.routes.js";

// App config
const app = express();
const port = process.env.PORT || 4000;

// ✅ CORS configuration
const allowedOrigins = [
  "http://127.0.0.1:5500",                    // For HTML frontend running locally
  "http://localhost:5173",                   // For React frontend running locally (Vite)
  "https://skr-project-frontend.onrender.com", // Public user site
  "https://skr-project-admin.onrender.com",    // Admin panel
];

// ✅ CORS middleware
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Routes
app.use("/api/receipt", receiptRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/comments", commentRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Gordon Security API is running" });
});

// ✅ Start DB and server
connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
});
