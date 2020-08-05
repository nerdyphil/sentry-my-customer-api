const { Schema, model } = require("mongoose");

const activitySchema = new Schema(
  {
    store_admin_ref: {
      type: Schema.Types.ObjectId,
      ref: "store_admin"
    },
    store_assistant_ref: {
      type: Schema.Types.ObjectId,
      ref: "storeAssistant"
    },
    method: String,
    originalUrl: String,
    httpVersion: String,
    headers: Object,
    body: Object,
    params: Object
  },
  { timestamps: true }
);

module.exports = model("activity", activitySchema);
