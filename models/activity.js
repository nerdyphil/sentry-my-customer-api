const { Schema, model } = require("mongoose");

const activitySchema = new Schema(
  {
    store_admin_ref: {
      type: Schema.Types.ObjectId,
      ref: "store_admin",
    },
    store_assistant_ref: {
      type: Schema.Types.ObjectId,
      ref: "storeAssistant",
    },
    time: { type: Date },
    operation: {
      method: String,
      url: String,
      header: Object,
      body: Object
    }
  },
  { timestamps: true }
);

module.exports = model("activity", activitySchema);
