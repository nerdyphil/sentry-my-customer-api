const { Schema, model } = require("mongoose");

const activitySchema = new Schema(
  {
    store_admin_ref: {
      type: Schema.Types.ObjectId,
      ref: "store_admin",
      required: true,
    },
    store_assistant_ref: {
      type: Schema.Types.ObjectId,
      ref: "storeAssistant",
      required: true,
    },
    time: { type: Date },
    operation: {
      operation_type: String,
      object: {
        updated_field1: String,
        updated_field2: String
      }
    }
  },
  { timestamps: true }
);

module.exports = model("activity", activitySchema);
