const { Schema, model } = require("mongoose");

//schema for store assistant
const storeAssistantSchema = new Schema(
  {
    store_admin_ref: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "store_admin",
    },
    name: { type: String, required: true },
    first_name: { type: String, default: "Not set" },
    last_name: { type: String, default: "Not set" },
    phone_number: { type: String, required: true, unique: true },
    email: { type: String },
    password: { type: String, default: "password" },
    is_active: { type: Boolean, default: 1 },
    api_token: { type: String },
    store_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "mycustomer_store",
    },
    user_role: { type: String, default: "store_assistant" },
  },
  { timestamps: true }
);

module.exports = model("storeAssistant", storeAssistantSchema);
