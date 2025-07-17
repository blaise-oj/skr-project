import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js"
import receipt from "./models/receipt.model.js"
import receiptRoutes from "./routes/receipt.route.js"
import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js"
import dotenv from "dotenv";



//app config
const app = express()
const port = process.env.PORT || 4000;
dotenv.config();


//middleware
app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ extended: false }))

// routes
app.use("/api/receipt", receiptRoutes)
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Gordon Security API is running" });
});

//db connection
connectDB().then(() => {

    app.listen(port, () => {
        console.log(`server started on http://localhost:${port}`)
    })
});






