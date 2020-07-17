const User = require("../models/store_admin");
const { body } = require("express-validator/check");
const bCrypt = require("bcryptjs");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
});

const makeid = require("../util/code_random");
const codeLength = 6;
exports.validate = (method) => {
  switch (method) {
    case "recover": {
      return [body("phone_number").isNumeric()];
    }
    case "reset": {
      return [
        body("token")
          .isNumeric()
          .isLength({ min: codeLength, max: codeLength }),
        body("password").not().isEmpty(),
      ];
    }
  }
};

module.exports.recover = async (req, res) => {
  User.findOne({ identifier: req.body.phone_number })
    .then((user) => {
      if (!user)
        return res.status(401).json({
          message:
            "The phone number is not associated with any account. Double-check your phone number and try again.",
        });

      //Generate and set password reset token
      const dateToday = new Date();
      const dayToday = dateToday.getDate();
      user.resetPasswordToken = makeid(codeLength, false);
      user.resetPasswordExpires = dayToday;

      // Save the updated user object
      user
        .save()
        .then((user) => {
          res.status(200).json({
            success: true,
            message: "successful",
            data: {
              message: "successful",
            },
          });
          const sms = africastalking.SMS;
          sms
            .send({
              to: [`+${user.local.phone_number}`],
              message: `Your number verification to MyCustomer is ${user.resetPasswordToken}`,
            })
            .then((response) => {
              console.log(response);
              return res.status(200).json({
                success: true,
                message: "successful",
                data: {
                  message: "Reset token sent successfully",
                },
              });
            })
            .catch((error) => {
              console.log(error);
              res.status(500).json({
                success: false,
                message: "Something went wrong.",
                data: {
                  statusCode: 500,
                  error: "Something went wrong.",
                },
              });
            });
        })
        .catch((err) => res.status(500).json({ message: err.message }));
    })
    .catch((err) => res.status(500).json({ message: err.message }));
};

module.exports.resetPassword = async (req, res, next) => {
  try {
    const todayDate = new Date();
    const today = todayDate.getDate();
    let resetuser;
    try {
      resetuser = await User.findOne({
        resetPasswordToken: req.body.token,
        resetPasswordExpires: today,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Something went wrong.",
        data: {
          statusCode: 500,
          error: err.message,
        },
      });
    }
    if (!resetuser) {
      return res
        .status(401)
        .json({ message: "Password reset token is invalid or has expired." });
    }
    let match;
    try {
      match = await bCrypt.compare(req.body.password, resetuser.local.password);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Something went wrong.",
        data: {
          statusCode: 500,
          error: err.message,
        },
      });
    }
    if (match) {
      res.status(409).json({
        success: false,
        message:
          "You can't reset to an old password please choose a new password and try again",
      });
    } else {
      //Set the new password
      resetuser.local.password = await bCrypt.hash(req.body.password, 10);
      resetuser.resetPasswordToken = undefined;
      resetuser.resetPasswordExpires = undefined;
      try {
        await resetuser.save();
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Something went wrong.",
          data: {
            statusCode: 500,
            error: err.message,
          },
        });
      }

      const sms = africastalking.SMS;
      sms
        .send({
          to: [`+${resetuser.local.phone_number}`],
          message: `Your password has been successfully changed.`,
        })
        .then((response) => {
          console.log(response);
          res.status(200).json({
            success: true,
            message: "successful",
            data: {
              message: "successful",
            },
          });
        });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong.",
      data: {
        statusCode: 500,
        error: "Something went wrong.",
      },
    });
  }
};
