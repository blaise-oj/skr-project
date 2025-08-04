// routes/test.routes.js

import express from "express";
import nodemailer from "nodemailer";
const router = express.Router();

// POST /api/test/send-test
router.post("/send-test", async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "mail.privateemail.com",   // Namecheap SMTP host
      port: 465,                        // Secure port
      secure: true,                    // Use SSL
      auth: {
        user: process.env.EMAIL_USER, // info@gordonsecurities.com
        pass: process.env.EMAIL_PASS  // Password or app password
      },
    });

    const mailOptions = {
      from: `"Gordon Security" <${process.env.EMAIL_USER}>`,
      to: "info@gordonsecurities.com",  // Test email to yourself
      subject: "Test Email from Gordon Security via Namecheap",
      text: "✅ This is a test email sent using Namecheap Private Email SMTP.",
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Test email sent using Namecheap SMTP!" });
  } catch (error) {
    console.error("Namecheap mail error:", error);
    res.status(500).json({ success: false, error: "Failed to send email using Namecheap" });
  }
});

export default router;

