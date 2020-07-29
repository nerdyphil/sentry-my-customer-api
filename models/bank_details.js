const mongoose = require("mongoose");

module.exports = mongoose.model("bankDetails", {
    bank: String,
    account_number: Number,
    account_name: String
});