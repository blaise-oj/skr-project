// routes/test.routes.js

import express from "express";
import nodemailer from "nodemailer";
const router = express.Router();

// POST /api/test/send-test
router.post("/send-test", async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true, // true for port 465, false for 587
      auth: {
        user: process.env.EMAIL_USER, // your Zoho email address
        pass: process.env.EMAIL_PASS  // your Zoho app password
      },
    });

    const mailOptions = {
      from: `"Gordon Security" <${process.env.EMAIL_USER}>`,
      to: "info@gordonsecurities.com", // Replace with your real test email
      subject: "Test Email from Gordon Security",
      text: "This is a test email to verify Zoho Mail configuration.",
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Test email sent using Zoho!" });
  } catch (error) {
    console.error("Zoho mail error:", error);
    res.status(500).json({ success: false, error: "Failed to send email using Zoho" });
  }
});

export default router;
