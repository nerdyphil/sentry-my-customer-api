const User = require("../models/store_admin");
const Assistant = require("../models/storeAssistant");
const { body } = require("express-validator/check");
const bCrypt = require("bcryptjs");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
});
const onFinished = require("on-finished");
const Activity = require("../models/activity");
const makeid = require("../util/code_random");
const codeLength = 6;
exports.validate = method => {
  switch (method) {
    case "recover": {
      return [body("phone_number").isNumeric()];
    }
    case "reset": {
      return [
        body("token")
          .isNumeric()
          .isLength({ min: codeLength, max: codeLength }),
        body("password")
          .not()
          .isEmpty()
      ];
    }
  }
};

module.exports.recover = async (req, res) => {
  const phone_number = req.body.phone_number;
  const store_admin = await User.findOne({ identifier: phone_number });
  const store_assistant = await Assistant.findOne({
    phone_number: phone_number
  });
  if (store_admin) {
    sendToken(store_admin, req, res);
  } else if (store_assistant) {
    sendToken(store_assistant, req, res);
  } else {
    noUser(res);
  }
};
//when there's no user
async function noUser(res) {
  res.status(404).json({
    success: false,
    message:
      "The phone number is not associated with any account. Double-check your phone number and try again",
    error: {
      statusCode: 404,
      message:
        "The phone number is not associated with any account. Double-check your phone number and try again"
    }
  });
}
//send password reset
async function sendToken(user, req, res) {
  //Generate and set password reset token
  const dateToday = new Date();
  const dayToday = dateToday.getDate();
  user.resetPasswordToken = makeid(codeLength, false);
  user.resetPasswordExpires = dayToday;
  user.save();

  //get recipient phone
  let recipient;
  if (user.local) recipient = user.local.phone_number;
  else recipient = user.phone_number;
  const sms = africastalking.SMS;

  sms
    .send({
      to: [`+${recipient}`],
      message: `Your password reset token for MyCustomer is ${user.resetPasswordToken}`
    })
    .then(async response => {
      await onFinished(res, async (err, res) => {
        /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
        const { method, originalUrl, httpVersion, headers, body, params } = req;
        /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
        await Activity.create({
          creator_ref: req.user._id,
          method,
          originalUrl,
          httpVersion,
          headers,
          body,
          params
        });
        // const activity = await Activity.findOne({"body.phone_number": "2348136814497"});
        // console.log(activity);
      });
      return res.status(200).json({
        success: true,
        message: "successful",
        data: {
          statusCode: 200,
          message: "Reset token sent successfully"
        }
      });
    })
    .catch(error => {
      return res.status(500).json({
        success: false,
        message: "Something went wrong.",
        data: {
          statusCode: 500,
          error: "Something went wrong."
        }
      });
    });
}

module.exports.resetPassword = async (req, res, next) => {
  const today = new Date().getDate();
  const store_admin = await User.findOne({
    resetPasswordToken: req.body.token,
    resetPasswordExpires: new Date(today)
  });
  const store_assistant = await Assistant.findOne({
    resetPasswordToken: req.body.token,
    resetPasswordExpires: new Date(today)
  });
  try {
    const todayDate = new Date();
    const today = todayDate.getDate();
    let resetuser;
    let passwordField;

    if (store_admin) {
      resetuser = store_admin;
      passwordField = "resetuser.local.password";
    } else if (store_assistant) {
      resetuser = store_assistant;
      passwordField = "resetuser.password";
    }
    if (!resetuser) {
      invalidToken(res);
    }
    let match;

    //get password currently in database
    let oldPassword;
    if (store_admin) oldPassword = resetuser.local.password;
    else {
      oldPassword = resetuser.password;
    }

    try {
      //compare new and old password
      match = await bCrypt.compare(req.body.password, oldPassword);
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Something went wrong.",
        data: {
          statusCode: 500,
          error: err.message
        }
      });
    }
    if (match) {
      res.status(409).json({
        success: false,
        message:
          "You can't reset to an old password please choose a new password and try again",
        error: {
          statusCode: 409,
          message:
            "You can't reset to an old password please choose a new password and try again"
        }
      });
    } else {
      //Set the new password
      if (store_admin)
        resetuser.local.password = await bCrypt.hash(req.body.password, 10);
      else if (store_assistant)
        resetuser.password = await bCrypt.hash(req.body.password, 10);
      resetuser.resetPasswordToken = undefined;
      resetuser.resetPasswordExpires = undefined;
      try {
        await resetuser.save();
        await onFinished(res, async (err, res) => {
          /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
          const {
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          } = req;
          /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
          await Activity.create({
            creator_ref: req.user._id,
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });
          // const activity = await Activity.findOne({"body.phone_number": "2348136814497"});
          // console.log(activity);
        });
        passwordChanged(resetuser, res);
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Something went wrong.",
          data: {
            statusCode: 500,
            error: err.message
          }
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong.",
      data: {
        statusCode: 500,
        error: "Something went wrong."
      }
    });
  }
};
async function invalidToken(res) {
  return res.status(401).json({
    success: false,
    message: "Password reset token is invalid or has expired",
    error: {
      statusCode: 401,
      message: "Password reset token is invalid or has expired"
    }
  });
}

async function passwordChanged(resetuser, res) {
  let recipient;
  if (resetuser.local) recipient = resetuser.local.phone_number;
  else recipient = resetuser.phone_number;

  //send sms
  const sms = africastalking.SMS;
  sms
    .send({
      to: [`+${recipient}`],
      message: `Your MyCustomer account password reset was successful`
    })
    .then(response => {
      res.status(200).json({
        success: true,
        message: "Password reset successful",
        data: {
          statusCode: 200,
          message: "Password reset successful"
        }
      });
    });
}
