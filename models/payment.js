const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, default: "flutterwave" },
    reference: { type: String },
    transaction: { type: String },
    status: { type: String },
    data: { type:  Object },
    transaction_ref_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
    debt_ref_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "debt_reminder",
    },
  },
  { timestamp: true }
);

module.exports = mongoose.model("payment", paymentSchema);