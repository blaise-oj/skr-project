import mongoose from "mongoose";
import receipt from "../models/receipt.model.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import QRCode from "qrcode";
import axios from "axios";
import nodemailer from "nodemailer"
import crypto from "crypto"
import africastalking from "africastalking";

// Initializing Africa's Talking
const africastalkingInstance = africastalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
});

const sms = africastalkingInstance.SMS;




//get all receipts
const getReceipts = async (req, res) => {
  try {
    const Receipts = await receipt.find({});
    res.status(200).json(Receipts);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
//get a receipt
const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const Receipt = await receipt.findById(id);
    res.status(200).json(Receipt);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Helper to generate random tracking code
const generateTrackingId = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 characters
};

// POST /api/receipt
const createReceipt = async (req, res) => {
  try {
    const { name, quantity, weight, client, notificationMethod } = req.body;
    const trackingId = generateTrackingId();

    const newReceipt = new receipt({
      name,
      quantity,
      weight,
      trackingId,
      client
    });

    await newReceipt.save();

    const notifyType = notificationMethod === "sms" ? "sms" : "email";

    // Validation based on selected notification method
    if (notifyType === "email" && !client?.email) {
      return res.status(400).json({ message: "Client email is required for email notification" });
    }

    if (notifyType === "sms" && !client?.phone) {
      return res.status(400).json({ message: "Client phone number is required for SMS notification" });
    }

    if (notifyType === "email") {
      // === EMAIL NOTIFICATION ===
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: '"Gordon Security" <no-reply@gordonsecurity.com>',
        to: client.email,
        subject: "Your Storage Receipt Tracking Code",
        html: `
          <p>Hello ${client.name || ''},</p>
          <p>Your storage receipt has been created.</p>
          <p><strong>Tracking ID:</strong> ${trackingId}</p>
          <p>You can use this code to track your receipt on our website.</p>
          <p>Thank you,<br>Gordon Security</p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully.");

    } else if (notifyType === "sms") {
      // === SMS NOTIFICATION ===
      let phone = client.phone.trim();

      if (phone.startsWith("0")) {
        phone = "+254" + phone.slice(1);
      } else if (phone.startsWith("254")) {
        phone = "+" + phone;
      } else if (!phone.startsWith("+254")) {
        return res.status(400).json({ message: "Invalid phone number format. Use 07XXXXXXXX." });
      }

      const message = `Hello ${client.name || ''}, your storage receipt has been created.\nTracking ID: ${trackingId}\n- Gordon Security`;

      const smsResponse = await sms.send({
        to: [phone],
        message,
        from: process.env.SMS_SENDER_ID || "GORDONSECURITY",
      });

      console.log("📨 Africa's Talking SMS response:", JSON.stringify(smsResponse, null, 2));

      const recipientStatus = smsResponse.SMSMessageData?.Recipients?.[0]?.status;

      if (recipientStatus !== "Success") {
        console.error("❌ SMS delivery failed:", smsResponse.SMSMessageData?.Recipients?.[0]);
      } else {
        console.log("✅ SMS sent successfully to", phone);
      }

    }

    res.status(201).json({
      message: `Receipt created and ${notifyType.toUpperCase()} sent`,
      trackingId
    });

  } catch (error) {
    console.error("❌ Error creating receipt or sending notification:", error);
    res.status(500).json({ message: "Failed to create receipt" });
  }
};




// Search by Tracking ID (renamed from searchByTrackCode)
// Protect route with authentication middleware
const searchByTrackingId = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const userEmail = req.user?.email; // this comes from verifyToken middleware

    const foundReceipt = await receipt.findOne({ trackingId });

    if (!foundReceipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Only allow if the receipt's client email matches the logged-in user's email
    if (foundReceipt.client?.email !== userEmail) {
      return res.status(403).json({ message: "You are not authorized to view this receipt." });
    }

    res.status(200).json(foundReceipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// PDF export function

export const generateReceiptPDF = async (req, res) => {
  const { trackingId } = req.params;

  try {
    const receiptData = await receipt.findOne({ trackingId });

    if (!receiptData) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Generate QR code from trackingId
    const qrImageUrl = await QRCode.toDataURL(receiptData.trackingId);
    const qrImageBytes = Buffer.from(qrImageUrl.split(",")[1], "base64");

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);

    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText("Gordon Security Company", {
      x: 50,
      y: height - 50,
      size: 18,
      font,
      color: rgb(0.2, 0.4, 0.7),
    });

    page.drawText(`Receipt for Tracking ID: ${receiptData.trackingId}`, {
      x: 50,
      y: height - 80,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });

    const startY = height - 110;
    let currentY = startY;

    page.drawText(`Tracking ID: ${receiptData.trackingId}`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    page.drawText(`Item: ${receiptData.name}`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    page.drawText(`Quantity: ${receiptData.quantity}`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    page.drawText(`Weight: ${receiptData.weight} kg`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    page.drawText(`Stored By: ${receiptData.client?.name || "N/A"}`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    page.drawText(`Phone: ${receiptData.client?.phone || "N/A"}`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    page.drawText(`Email: ${receiptData.client?.email || "N/A"}`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    page.drawText(`Status: ${receiptData.status}`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    page.drawText(`Deposit Date: ${new Date(receiptData.depositDate).toLocaleString('en-KE')}`, { x: 50, y: currentY, size: 12, font });
    currentY -= 20;

    // Added withdrawal date only if it exists
    if (receiptData.withdrawalDate) {
      page.drawText(`Withdrawal Date: ${new Date(receiptData.withdrawalDate).toLocaleString('en-KE')}`, { x: 50, y: currentY, size: 12, font });
      currentY -= 20;
    }

    // Embed QR code
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const qrDims = qrImage.scale(0.5);

    page.drawImage(qrImage, {
      x: 400,
      y: 100,
      width: qrDims.width,
      height: qrDims.height,
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=receipt.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("PDF error:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};

//QR code
export const generateQRCode = async (req, res) => {
  const { trackingId } = req.params;
  try {
    const qr = await QRCode.toDataURL(trackingId);
    res.status(200).json({ qrCode: qr });
  } catch (error) {
    res.status(500).json({ message: "QR generation failed" });
  }
};

//mark a receipt as withdrawn

const markAsWithdrawn = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { notificationMethod } = req.body; // <-- allow admin to choose sms or email

    const updatedReceipt = await receipt.findOneAndUpdate(
      { trackingId },
      {
        status: "withdrawn",
        withdrawalDate: new Date(),
      },
      { new: true }
    );

    if (!updatedReceipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found. Check tracking ID.",
      });
    }

    const client = updatedReceipt.client;

    // Validate contact info
    if (notificationMethod === "email" && !client?.email) {
      return res.status(400).json({ message: "Client email is missing" });
    }

    if (notificationMethod === "sms" && !client?.phone) {
      return res.status(400).json({ message: "Client phone is missing" });
    }

    // === EMAIL Notification ===
    if (notificationMethod === "email") {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: '"Gordon Security" <info@gordonsecurity.com>',
        to: client.email,
        subject: "Your Item Has Been Withdrawn",
        html: `
          <p>Hello ${client.name || ''},</p>
          <p>This is to inform you that your item associated with tracking ID <strong>${updatedReceipt.trackingId}</strong> has been withdrawn from storage.</p>
          <p>Withdrawal Date: ${new Date(updatedReceipt.withdrawalDate).toLocaleString('en-KE')}</p>
          <p>Status: <strong>${updatedReceipt.status}</strong></p>
          <p>Thank you,<br>Gordon Security</p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log("✅ Withdrawal email sent to client.");

      // === SMS Notification ===
    } else if (notificationMethod === "sms") {
      let phone = client.phone.trim();
      if (phone.startsWith("0")) {
        phone = "+254" + phone.slice(1);
      } else if (phone.startsWith("254")) {
        phone = "+" + phone;
      } else if (!phone.startsWith("+254")) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      const message = `Hello ${client.name || ''}, your item with tracking ID ${updatedReceipt.trackingId} has been withdrawn. Thank you - Gordon Security`;

      const smsResponse = await sms.send({
        to: [phone],
        message,
        from: process.env.SMS_SENDER_ID || "GORDONSECURITY",
      });

      console.log("📨 SMS Response:", smsResponse);
    }

    return res.status(200).json({
      success: true,
      message: "Receipt marked as withdrawn and client notified.",
      receipt: updatedReceipt,
    });

  } catch (error) {
    console.error("❌ Withdrawal error:", error);
    return res.status(500).json({
      success: false,
      message: error.message.includes("ObjectId")
        ? "Use tracking ID instead of database ID"
        : error.message,
    });
  }
};




//update a receipt

const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await receipt.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//delete a receipt

const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const Receipt = await receipt.findByIdAndDelete(id, req.body);

    if (!Receipt) {
      return res.status(404).json({ message: "receipt not found" });
    }
    res.status(200).json({ message: "receipt deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export { getReceipts, getReceipt, createReceipt, markAsWithdrawn, deleteReceipt, searchByTrackingId, updateReceipt };