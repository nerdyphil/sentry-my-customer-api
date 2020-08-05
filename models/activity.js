const { Schema, model } = require("mongoose");

const activitySchema = new Schema(
  {
    creator_ref: {
      type: Schema.Types.ObjectId,
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
