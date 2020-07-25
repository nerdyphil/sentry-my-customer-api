const mongoose = require("mongoose");

const FeedbackSchema = mongoose.Schema({
    user: {
        // who sends messages
        type: mongoose.Schema.Types.ObjectId,
        ref: "store_admin"
    },
    userPhone: {
        type: String,
    },
    userRole: {
        type: String,
    },
    messages: {
        // Messages sent by users and super admin
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
});

module.exports = mongoose.model('complaint_feedbacks', FeedbackSchema);