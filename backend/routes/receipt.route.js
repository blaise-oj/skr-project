import express from "express"
import receipt from "../models/receipt.model.js"
import {getReceipts,getReceipt,createReceipt,deleteReceipt,searchByTrackingId,markAsWithdrawn,generateReceiptPDF, generateQRCode, updateReceipt} from "../controllers/receipt.controller.js"
import { validateReceipt } from "../middleware/validateReceipt.js"

const router = express.Router()

router.get('/',getReceipts);
router.get("/:id",getReceipt);
router.post("/",validateReceipt, createReceipt,);

router.get('/track/:trackingId', searchByTrackingId);


router.patch("/:trackingId/withdraw", markAsWithdrawn);
router.delete("/:id",deleteReceipt);

router.get("/:trackingId/pdf", generateReceiptPDF);
router.get("/track/:trackingId/qrcode", generateQRCode);

router.put("/:id", updateReceipt);


export default router;
    