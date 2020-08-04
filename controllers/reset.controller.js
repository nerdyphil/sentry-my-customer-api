const User = require("../models/store_admin");
const Assistant = require("../models/storeAssistant");
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
  const phone_number = req.body.phone_number;
  const store_admin = await User.findOne({ identifier:  phone_number});
  const store_assistant = await Assistant.findOne({ phone_number: phone_number });
  if(store_admin){
    sendToken(store_admin, res);
  }
  else if(store_assistant){
    sendToken(store_assistant, res);
  }else{
    noUser(res);
  }
};
//when there's no user
async function noUser(res){
  res.status(404).json({
    success: false,
    message: "The phone number is not associated with any account. Double-check your phone number and try again",
    error:{
      statusCode: 404,
      message: "The phone number is not associated with any account. Double-check your phone number and try again"
    }
  });
}
//send password reset
async function sendToken(user, res){
   //Generate and set password reset token
   const dateToday = new Date();
   const dayToday = dateToday.getDate();
   user.resetPasswordToken = makeid(codeLength, false);
   user.resetPasswordExpires = dayToday;

   //get recipient phone
   let recipient;
   if (user.local) recipient = user.local.phone_number;
   else recipient = user.phone_number;
  const sms = africastalking.SMS;

sms
  .send({
    to: [`+${recipient}` ],
    message: `Your password reset token for MyCustomer is ${user.resetPasswordToken}`,
  })
  .then((response) => {
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
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      data: {
        statusCode: 500,
        error: "Something went wrong.",
      },
    });
  });
}


module.exports.resetPassword = async (req, res, next) => {
  const today = new Date();
  const store_admin = await User.findOne({
    resetPasswordToken: req.body.token,
    resetPasswordExpires: today,
  });
  const store_assistant = await Assistant.findOne({
    resetPasswordToken: req.body.token,
    resetPasswordExpires: today,
  });
  try {
    const todayDate = new Date();
    const today = todayDate.getDate();
    let resetuser;
    let passwordField;

    if(store_admin) {
      resetuser = store_admin;
      console.log("ADMIN", resetuser)
      passwordField = resetuser.local.password;
    }
    else if(store_assistant) { 
      console.log("ASS", resetuser)
      resetuser = store_assistant;
      passwordField = resetuser.password;
    }
    if (!resetuser) {
      invalidToken(res);
    }
    let match;

    //get password currently in database
    let oldPassword;
    if(store_admin) oldPassword = resetuser.local.password;
    else {
      console.log(resetuser);
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
          error: err.message,
        },
      });
    }
    if (match) {
      res.status(409).json({
        success: false,
        message:"You can't reset to an old password please choose a new password and try again",
        error: {
          statusCode: 409,
          message: "You can't reset to an old password please choose a new password and try again"
        }
      });
    } else {
      //Set the new password
      passwordField = await bCrypt.hash(req.body.password, 10);
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
async function invalidToken(res){
  return res.status(401).json({
    success: false,
    message: "Password reset token is invalid or has expired",
    error:{
      statusCode: 401,
      message: "Password reset token is invalid or has expired"
    }
    });
}

async function passwordChanged(res){
  let recipient;
  if(resetuser.local) recipient = recipient.local.phone_number;
  else recipient = resetuser.phone_number;

  //send sms
  const sms = africastalking.SMS;
  sms
    .send({
      to: [`+${resetuser.local.phone_number}`],
      message: `Your password has been successfully changed.`,
    })
    .then((response) => {
      res.status(200).json({
        success: true,
        message: "successful",
        data: {
          message: "successful",
        },
      });
    });
}