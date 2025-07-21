import express from "express"
import receipt from "../models/receipt.model.js"
import {getReceipts,getReceipt,createReceipt,deleteReceipt,searchByTrackingId,markAsWithdrawn,generateReceiptPDF, generateQRCode, updateReceipt} from "../controllers/receipt.controller.js"
import { validateReceipt } from "../middleware/validateReceipt.js"
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router()

router.get('/',getReceipts);
router.get("/:id",getReceipt);
router.post("/", verifyAdmin, validateReceipt, createReceipt);


router.patch("/:trackingId/withdraw", markAsWithdrawn);
router.delete("/:id",deleteReceipt);

router.get("/:trackingId/pdf", generateReceiptPDF);
router.get("/track/:trackingId/qrcode", generateQRCode);
router.get('/track/:trackingId', verifyToken, searchByTrackingId);

router.put("/:id", updateReceipt);


export default router;
    