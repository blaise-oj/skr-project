import mongoose from "mongoose";
import receipt from "../models/receipt.model.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import QRCode from "qrcode";
import crypto from "crypto";
import africastalking from "africastalking";
import * as Brevo from "@getbrevo/brevo";  // ✅ fixed import

// --- Initialize Africa's Talking ---
const africastalkingInstance = africastalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
});
const sms = africastalkingInstance.SMS;

// --- Initialize Brevo ---
const brevoClient = new Brevo.TransactionalEmailsApi();
brevoClient.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// --- Helper: send email via Brevo ---
const sendBrevoEmail = async (to, subject, html) => {
  try {
    const email = {
      sender: { name: "Gordon Security", email: "info@gordonsecurities.com" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };
    const result = await brevoClient.sendTransacEmail(email);
    console.log("✅ Brevo email sent:", result.messageId || result);
    return result;
  } catch (error) {
    console.error("❌ Brevo email error:", error.response?.body || error.message);
    throw new Error("Email sending failed");
  }
};

// --- Generate unique tracking ID ---
const generateTrackingId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let randomPart = "";
  for (let i = 0; i < 12; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GSC${randomPart}-CARGO`;
};


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

    const newReceipt = new receipt({
      name,
      quantity,
      weight,
      trackingId,
      client,
      createdBy,
    });
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
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background-color: #0a2e5c; color: #ffffff; padding: 16px; text-align: center;">
        <h2 style="margin: 0;">Gordon Security</h2>
      </div>

      <!-- Body -->
      <div style="padding: 24px; color: #333333; font-size: 15px; line-height: 1.6;">
        <p>Hello <strong>${client.name || ""}</strong>,</p>
        <p>Your storage receipt has been created successfully.</p>

        <div style="background-color: #f0f9ff; padding: 16px; margin: 20px 0; border: 1px solid #b6e0fe; border-radius: 6px;">
          <p style="margin: 0; font-size: 15px;">
            <strong>Tracking ID:</strong> ${trackingId}<br>
            <strong>Status:</strong> Deposited<br>
            <strong>Deposit Date:</strong> ${new Date().toLocaleString("en-KE")}
          </p>
        </div>

        <p>You can use the above tracking ID to monitor your receipt on our website.</p>

        <p style="margin-bottom: 0;">Thank you,<br><strong>Gordon Security Team</strong></p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f4f4f4; padding: 12px; text-align: center; font-size: 12px; color: #888;">
        © ${new Date().getFullYear()} Gordon Security. All rights reserved.
      </div>
    </div>
    `
  );
    } 
    else if (notifyType === "sms") {
      let phone = client.phone.trim();
      if (phone.startsWith("0")) phone = "+254" + phone.slice(1);
      else if (phone.startsWith("254")) phone = "+" + phone;
      else if (!phone.startsWith("+254"))
        return res
          .status(400)
          .json({ message: "Invalid phone number format" });

      const message = `Hello ${
        client.name || ""
      }, your storage receipt has been created.\nTracking ID: ${trackingId}\n- Gordon Security`;

      const smsResponse = await sms.send({
        to: [phone],
        message,
        from: process.env.SMS_SENDER_ID || "GORDONSECURITY",
      });

      console.log("📨 SMS sent:", smsResponse);
    }

    res.status(201).json({
      message: `Receipt created and ${notifyType.toUpperCase()} sent`,
      trackingId,
    });
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
    if (!foundReceipt)
      return res.status(404).json({ message: "Receipt not found" });

    if (!isAdmin && foundReceipt.client?.email !== userEmail)
      return res
        .status(403)
        .json({ message: "You are not authorized to view this receipt." });

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
    if (!receiptData)
      return res.status(404).json({ message: "Receipt not found" });

    // ✅ Generate QR Code
    const qrImageUrl = await QRCode.toDataURL(receiptData.trackingId);
    const qrImageBytes = Buffer.from(qrImageUrl.split(",")[1], "base64");

    // ✅ Create PDF with A4 size
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { height, width } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ✅ Company Logo
    const logoBytes = fs.readFileSync("public/images/logo.png"); // your logo file
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.18); // adjust size
    page.drawImage(logoImage, {
      x: 50,
      y: height - 100,
      width: logoDims.width,
      height: logoDims.height,
    });

    // ✅ Header - Company Name
    page.drawText("GORDON SECURITY COMPANY", {
      x: 200,
      y: height - 60,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.3, 0.6),
    });

    // ✅ Header - Slogan / Description
    page.drawText("Trusted Cargo & Security Solutions", {
      x: 200,
      y: height - 80,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    // ✅ Company Contact Info (letterhead style)
    page.drawText("Head Office: Nairobi, Kenya | Tel: +254 715 293 884 | Email: info@gordonsecurities.com", {
      x: 50,
      y: height - 120,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // ✅ Section Title
    page.drawText(`Receipt for Tracking ID: ${receiptData.trackingId}`, {
      x: 50,
      y: height - 160,
      size: 14,
      font,
      color: rgb(0, 0, 0),
    });

    // ✅ Helper function for EAT timezone
    const formatDate = (date) => {
      return new Date(date).toLocaleString("en-KE", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // --- Table Setup ---
    let tableTop = height - 200;
    let tableLeft = 50;
    let tableRight = width - 50;
    let rowHeight = 28;
    let colLabelWidth = 160;

    const rows = [
      ["Tracking ID", receiptData.trackingId],
      ["Item Name", receiptData.name],
      ["Quantity", receiptData.quantity],
      ["Weight", `${receiptData.weight} kg`],
      ["Client Name", receiptData.client?.name || "N/A"],
      ["Phone", receiptData.client?.phone || "N/A"],
      ["Email", receiptData.client?.email || "N/A"],
      ["Status", receiptData.status],
      ["Deposit Date", formatDate(receiptData.depositDate)],
    ];

    if (receiptData.withdrawalDate) {
      rows.push(["Withdrawal Date", formatDate(receiptData.withdrawalDate)]);
    }

    // --- Draw Table Border ---
    page.drawRectangle({
      x: tableLeft,
      y: tableTop - rowHeight * rows.length,
      width: tableRight - tableLeft,
      height: rowHeight * rows.length,
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 1,
    });

    // --- Draw Rows ---
    let y = tableTop;
    rows.forEach(([label, value]) => {
      page.drawLine({
        start: { x: tableLeft, y: y - rowHeight },
        end: { x: tableRight, y: y - rowHeight },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      page.drawLine({
        start: { x: tableLeft + colLabelWidth, y },
        end: { x: tableLeft + colLabelWidth, y: y - rowHeight },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      page.drawText(label, {
        x: tableLeft + 10,
        y: y - 19,
        size: 11,
        font: boldFont,
      });

      page.drawText(String(value), {
        x: tableLeft + colLabelWidth + 10,
        y: y - 19,
        size: 11,
        font,
      });

      y -= rowHeight;
    });

    // --- QR Code ---
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const qrDims = qrImage.scale(0.7);
    page.drawImage(qrImage, {
      x: width - qrDims.width - 80,
      y: 100,
      width: qrDims.width,
      height: qrDims.height,
    });

    // --- Footer ---
    page.drawText("© Gordon Security Company - All Rights Reserved", {
      x: 50,
      y: 50,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // ✅ Return PDF
    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=receipt_${receiptData.trackingId}.pdf`
    );
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

    // Build tracking URL (✅ update FRONTEND_URL in .env)
    const trackingUrl = `${process.env.FRONTEND_URL}/track/${trackingId}`;

    // Generate QR code with the full URL
    const qr = await QRCode.toDataURL(trackingUrl);

    res.status(200).json({ 
      qrCode: qr, 
      trackingUrl // send back the URL as well for debugging/frontend use
    });
  } catch (error) {
    console.error("❌ QR Code generation error:", error);
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
    if (!updatedReceipt)
      return res.status(404).json({ message: "Receipt not found" });

    const client = updatedReceipt.client;
    if (notificationMethod === "email" && !client?.email)
      return res.status(400).json({ message: "Client email is missing" });
    if (notificationMethod === "sms" && !client?.phone)
      return res.status(400).json({ message: "Client phone is missing" });

    if (notificationMethod === "email") {
      await sendBrevoEmail(
        client.email,
        "Your Item Has Been Withdrawn",
        `<p>Hello ${client.name || ""},</p>
         <p>Your item with tracking ID <strong>${
           updatedReceipt.trackingId
         }</strong> has been withdrawn.</p>
         <p>Withdrawal Date: ${new Date(
           updatedReceipt.withdrawalDate
         ).toLocaleString("en-KE")}</p>
         <p>Status: <strong>${updatedReceipt.status}</strong></p>
         <p>Thank you,<br>Gordon Security</p>`
      );
    } else if (notificationMethod === "sms") {
      let phone = client.phone.trim();
      if (phone.startsWith("0")) phone = "+254" + phone.slice(1);
      else if (phone.startsWith("254")) phone = "+" + phone;
      else if (!phone.startsWith("+254"))
        return res.status(400).json({ message: "Invalid phone number" });

      const message = `Hello ${
        client.name || ""
      }, your item with tracking ID ${
        updatedReceipt.trackingId
      } has been withdrawn. - Gordon Security`;

      const smsResponse = await sms.send({
        to: [phone],
        message,
        from: process.env.SMS_SENDER_ID || "GORDONSECURITY",
      });
      console.log("📨 SMS sent:", smsResponse);
    }

    res.status(200).json({
      success: true,
      message: "Receipt marked as withdrawn and client notified.",
      receipt: updatedReceipt,
    });
  } catch (error) {
    console.error("❌ Withdrawal error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Update receipt ---
const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await receipt.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updated)
      return res.status(404).json({ message: "Receipt not found" });
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
    if (!Receipt)
      return res.status(404).json({ message: "Receipt not found" });
    res.status(200).json({ message: "Receipt deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getReceipts,
  getReceipt,
  createReceipt,
  markAsWithdrawn,
  deleteReceipt,
  searchByTrackingId,
  updateReceipt,
};
