const UserModel = require("../models/store_admin");
const storeAssistantModel = require("../models/storeAssistant");
const Activity = require("../models/activity");
const { body } = require("express-validator/check");
const Customer = require("../models/customer");
const { errorHandler } = require("./login_controler");
const { customerService, storeService } = require("../services");

exports.retrieve = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    let activity;
    activity = await Activity.find({
      creator_ref: req.user._id
    }).sort({ createdAt: 1 });
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "No activity",
        error: {
          statusCode: 404
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "Activity retrieved successfully.",
        data: activity
      });
    }
  } catch (error) {
    errorHandler(error, res);
  }
};
