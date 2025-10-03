import mongoose from "mongoose";
import receipt from "../models/receipt.model.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import QRCode from "qrcode";
import crypto from "crypto";
import africastalking from "africastalking";
import Brevo from "@getbrevo/brevo";

// --- Initialize Africa's Talking ---
const africastalkingInstance = africastalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
});
const sms = africastalkingInstance.SMS;

// --- Initialize Brevo ---
const brevo = new Brevo.TransactionalEmailsApi();
brevo.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// --- Helper: send email via Brevo ---
const sendBrevoEmail = async (to, subject, html) => {
  const email = {
    sender: { name: "Gordon Security", email: "info@gordonsecurities.com" },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };
  return brevo.sendTransacEmail(email);
};

// --- Generate unique tracking ID ---
const generateTrackingId = () => crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 chars

// --- Get all receipts (admin) ---
const getReceipts = async (req, res) => {
  try {
    const Receipts = await receipt.find({});
    res.status(200).json(Receipts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Get single receipt by ID ---
const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const Receipt = await receipt.findById(id);
    res.status(200).json(Receipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Create receipt (admin) ---
const createReceipt = async (req, res) => {
  try {
    const { name, quantity, weight, client, notificationMethod } = req.body;
    const trackingId = generateTrackingId();
    const createdBy = req.user.id;

    const newReceipt = new receipt({ name, quantity, weight, trackingId, client, createdBy });
    await newReceipt.save();

    const notifyType = notificationMethod === "sms" ? "sms" : "email";

    // Validation
    if (notifyType === "email" && !client?.email)
      return res.status(400).json({ message: "Client email is required" });
    if (notifyType === "sms" && !client?.phone)
      return res.status(400).json({ message: "Client phone is required" });

    // --- Send notification ---
    if (notifyType === "email") {
      await sendBrevoEmail(
        client.email,
        "Your Storage Receipt Tracking Code",
        `<p>Hello ${client.name || ''},</p>
         <p>Your storage receipt has been created.</p>
         <p><strong>Tracking ID:</strong> ${trackingId}</p>
         <p>You can use this code to track your receipt on our website.</p>
         <p>Thank you,<br>Gordon Security</p>`
      );
      console.log("✅ Email sent via Brevo");
    } else if (notifyType === "sms") {
      let phone = client.phone.trim();
      if (phone.startsWith("0")) phone = "+254" + phone.slice(1);
      else if (phone.startsWith("254")) phone = "+" + phone;
      else if (!phone.startsWith("+254"))
        return res.status(400).json({ message: "Invalid phone number format" });

      const message = `Hello ${client.name || ''}, your storage receipt has been created.\nTracking ID: ${trackingId}\n- Gordon Security`;

      const smsResponse = await sms.send({
        to: [phone],
        message,
        from: process.env.SMS_SENDER_ID || "GORDONSECURITY",
      });

      console.log("📨 SMS sent:", smsResponse);
    }

    res.status(201).json({ message: `Receipt created and ${notifyType.toUpperCase()} sent`, trackingId });
  } catch (error) {
    console.error("❌ Error creating receipt:", error);
    res.status(500).json({ message: "Failed to create receipt" });
  }
};

// --- Search by tracking ID ---
const searchByTrackingId = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const userEmail = req.user?.email;
    const isAdmin = req.user?.isAdmin;

    const foundReceipt = await receipt.findOne({ trackingId });
    if (!foundReceipt) return res.status(404).json({ message: "Receipt not found" });

    if (!isAdmin && foundReceipt.client?.email !== userEmail)
      return res.status(403).json({ message: "You are not authorized to view this receipt." });

    res.status(200).json(foundReceipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Generate receipt PDF ---
export const generateReceiptPDF = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const receiptData = await receipt.findOne({ trackingId });
    if (!receiptData) return res.status(404).json({ message: "Receipt not found" });

    const qrImageUrl = await QRCode.toDataURL(receiptData.trackingId);
    const qrImageBytes = Buffer.from(qrImageUrl.split(",")[1], "base64");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText("Gordon Security Company", { x: 50, y: height - 50, size: 18, font, color: rgb(0.2, 0.4, 0.7) });
    page.drawText(`Receipt for Tracking ID: ${receiptData.trackingId}`, { x: 50, y: height - 80, size: 14, font });

    let y = height - 110;
    const drawField = (label, value) => { page.drawText(`${label}: ${value}`, { x: 50, y, size: 12, font }); y -= 20; };

    drawField("Tracking ID", receiptData.trackingId);
    drawField("Item", receiptData.name);
    drawField("Quantity", receiptData.quantity);
    drawField("Weight", `${receiptData.weight} kg`);
    drawField("Stored By", receiptData.client?.name || "N/A");
    drawField("Phone", receiptData.client?.phone || "N/A");
    drawField("Email", receiptData.client?.email || "N/A");
    drawField("Status", receiptData.status);
    drawField("Deposit Date", new Date(receiptData.depositDate).toLocaleString("en-KE"));
    if (receiptData.withdrawalDate) drawField("Withdrawal Date", new Date(receiptData.withdrawalDate).toLocaleString("en-KE"));

    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const qrDims = qrImage.scale(0.5);
    page.drawImage(qrImage, { x: 400, y: 100, width: qrDims.width, height: qrDims.height });

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=receipt.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("PDF error:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};

// --- Generate QR code ---
export const generateQRCode = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const qr = await QRCode.toDataURL(trackingId);
    res.status(200).json({ qrCode: qr });
  } catch (error) {
    res.status(500).json({ message: "QR generation failed" });
  }
};

// --- Mark receipt as withdrawn ---
const markAsWithdrawn = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { notificationMethod } = req.body;

    const updatedReceipt = await receipt.findOneAndUpdate(
      { trackingId },
      { status: "withdrawn", withdrawalDate: new Date() },
      { new: true }
    );
    if (!updatedReceipt) return res.status(404).json({ message: "Receipt not found" });

    const client = updatedReceipt.client;
    if (notificationMethod === "email" && !client?.email)
      return res.status(400).json({ message: "Client email is missing" });
    if (notificationMethod === "sms" && !client?.phone)
      return res.status(400).json({ message: "Client phone is missing" });

    if (notificationMethod === "email") {
      await sendBrevoEmail(
        client.email,
        "Your Item Has Been Withdrawn",
        `<p>Hello ${client.name || ''},</p>
         <p>Your item with tracking ID <strong>${updatedReceipt.trackingId}</strong> has been withdrawn.</p>
         <p>Withdrawal Date: ${new Date(updatedReceipt.withdrawalDate).toLocaleString("en-KE")}</p>
         <p>Status: <strong>${updatedReceipt.status}</strong></p>
         <p>Thank you,<br>Gordon Security</p>`
      );
      console.log("✅ Withdrawal email sent via Brevo");
    } else if (notificationMethod === "sms") {
      let phone = client.phone.trim();
      if (phone.startsWith("0")) phone = "+254" + phone.slice(1);
      else if (phone.startsWith("254")) phone = "+" + phone;
      else if (!phone.startsWith("+254")) return res.status(400).json({ message: "Invalid phone number" });

      const message = `Hello ${client.name || ''}, your item with tracking ID ${updatedReceipt.trackingId} has been withdrawn. - Gordon Security`;

      const smsResponse = await sms.send({ to: [phone], message, from: process.env.SMS_SENDER_ID || "GORDONSECURITY" });
      console.log("📨 SMS sent:", smsResponse);
    }

    res.status(200).json({ success: true, message: "Receipt marked as withdrawn and client notified.", receipt: updatedReceipt });
  } catch (error) {
    console.error("❌ Withdrawal error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Update receipt ---
const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await receipt.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Receipt not found" });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Delete receipt ---
const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const Receipt = await receipt.findByIdAndDelete(id);
    if (!Receipt) return res.status(404).json({ message: "Receipt not found" });
    res.status(200).json({ message: "Receipt deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getReceipts, getReceipt, createReceipt, markAsWithdrawn, deleteReceipt, searchByTrackingId, updateReceipt };
