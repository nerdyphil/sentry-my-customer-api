const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ComplaintFeedback = require("./complaint_feedbacks");

const ComplaintSchema = new mongoose.Schema({
  storeOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'store_admin',
  },
  storeOwnerPhone: {
    type: String,
  },
  name: {
    type: String,
    // required: true,
    // Name of Complainer
  },
  email: {
    type: String,
    // required: true,
    // Email of complainer
  },
  subject: {
    type: String,
    required: true,
    // Subject of Complaint
  },
  message: {
    type: String,
    required: true,
    // Message the complainer sends 
  },
  status: {
    type: String,
    enum: ["New", "Pending", "Resolved", "Closed"],
    default: "New"
  },
  feedbacks: [ComplaintFeedback.schema],
  date: {
    type: Date,
    default: Date.now 
  }
});


module.exports = mongoose.model('complaint_form', ComplaintSchema);