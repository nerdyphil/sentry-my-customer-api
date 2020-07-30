const mongoose = require('mongoose');
// const BroadcastMessages = require("./");

const BroadcastMessagesSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'store_admin',
    },
    senderPhone: {
        type: String,
    },
    message: {
        type: String,
        // required: true,
        // Message the complainer sends 
    },
    numbers: {
        type: Array,
        // required: true, 
    },
    status: {
        type: String,
        default: "Sent"
    },
    date: {
        type: Date,
        default: Date.now 
    }
});

module.exports = mongoose.model('broadcast_messages', BroadcastMessagesSchema);