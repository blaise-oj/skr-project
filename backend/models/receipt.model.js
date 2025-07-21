import mongoose from "mongoose";

const receiptSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter receipt name"],
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    weight: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },

    status: {
      type: String,
      enum: ["deposited", "withdrawn", "in-progress"],
      default: "deposited",
    },

    depositDate: {
      type: Date,
      default: Date.now,
    },

    trackingId: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Z0-9]{8}$/,
    },

    withdrawalDate: Date,

    client: {
      name: String,
      phone: String,
      email: String,
      identification: String,
    },

    // ✅ This line correctly tracks who created the receipt
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const receipt = mongoose.model("receipt", receiptSchema);
export default receipt;


