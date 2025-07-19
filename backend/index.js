import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js"
import receipt from "./models/receipt.model.js"
import receiptRoutes from "./routes/receipt.route.js"
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js"
import commentRoutes from "./routes/comment.routes.js";
import dotenv from "dotenv";



//app config
const app = express()
const port = process.env.PORT || 4000;
dotenv.config();

// CORS configuration
const allowedOrigins = [
  "http://127.0.0.1:5500", // For local testing
  "https://skr-project-frontend.onrender.com", // For deployed frontend
];


//middleware
app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ extended: false }))

// routes
app.use("/api/receipt", receiptRoutes)
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/comments", commentRoutes);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Only if you're sending cookies (optional)
}));

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Gordon Security API is running" });
});

//db connection
connectDB().then(() => {

    app.listen(port, () => {
        console.log(`server started on http://localhost:${port}`)
    })
});






