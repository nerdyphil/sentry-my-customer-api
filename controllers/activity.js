const UserModel = require("../models/store_admin");
const Activity = require("../models/activity");
const { body } = require("express-validator/check");
const Customer = require("../models/customer");
const { errorHandler } = require("./login_controler");
const { customerService, storeService } = require("../services");

exports.retrieve = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const user = await UserModel.findOne({
      $or: [
        {
          identifier: req.user.phone_number,
          "local.user_role": req.user.user_role
        },
        {
          "assistants.phone_number": req.user.phone_number,
          "assistants.user_role": req.user.user_role
        }
      ]
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }
    let activity;
    if (req.user.user_role == "store_assistant") {
      activity = await Activity.find({
        store_assistant_ref: req.user._id
      }).sort({ time: 1 });
    } else {
      activity = await Activity.find({
        store_admin_ref: req.user._id
      }).sort({ time: 1 });
    }
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

exports.populate = async (req, res) => {
  try {
    const { activity } = req.body;
    if (activity) {
      await Activity.insertMany(activity);
      const all = await Activity.find({
        $or: [
          {
            store_assistant_ref: req.user._id
          },
          {
            store_admin_ref: req.user._id
          }
        ]
      }).sort({ time: 1 });
      return res.status(200).json({
        success: true,
        message: "Logs synced successfully.",
        data: all
      });
    }
  } catch (error) {
    return errorHandler(error, res);
  }
}
