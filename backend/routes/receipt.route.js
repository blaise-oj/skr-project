import express from "express";
import {
  getReceipts,
  getReceipt,
  createReceipt,
  deleteReceipt,
  searchByTrackingId,
  markAsWithdrawn,
  generateReceiptPDF,
  generateQRCode,
  updateReceipt
} from "../controllers/receipt.controller.js";

import { validateReceipt } from "../middleware/validateReceipt.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// Route only for admin to get all receipts
router.get("/", getReceipts);

// ✅ Public route: anyone can track a receipt
router.get("/track/:trackingId", searchByTrackingId);

// ✅ Public QR Code route
router.get("/track/:trackingId/qrcode", generateQRCode);

// ✅ Public PDF download route
router.get("/:trackingId/pdf", generateReceiptPDF);

// General routes
router.get("/:id", getReceipt);
router.post("/", verifyAdmin, validateReceipt, createReceipt);
router.put("/:id", updateReceipt);
router.patch("/:trackingId/withdraw", markAsWithdrawn);
router.delete("/:id", deleteReceipt);

export default router;
