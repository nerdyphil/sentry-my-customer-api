const mongoose = require("mongoose");

module.exports = mongoose.model("banks", {
    id: Number,
    code: String,
    name: String
});