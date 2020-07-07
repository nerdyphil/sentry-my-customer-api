const { body } = require('express-validator/check');
const UserModel = require("../models/store_admin");
const OTP = require("../models/otp");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
});
const codeLength = 6;

exports.validate = (method) => {
  switch (method) {
    case 'send': {
      return [
        body('phone_number').isNumeric(),
      ]
    }
    case 'verify': {
      return [
        body('phone_number').isNumeric(),
        body('verify').isNumeric().isLength({ min: codeLength, max: codeLength })
      ]
    }
  }
}

exports.send = async (req, res) => {
  try {
    const user = await UserModel.findOne({ identifier: req.body.phone_number });

    if(!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          error: "User not found"
        }
      });
    }

    let otp = await OTP.findOne({ user_ref_code: user._id });

    if (otp) {
      otp.otp_code = makeid(codeLength);
    } else {
      otp = new OTP({
        otp_code: makeid(codeLength),
        user_ref_code: user._id
      });
    }

    const otpSaveResult = await otp.save();

    console.log("otpSaveResult", otpSaveResult)

    if(!otpSaveResult) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong.",
        data: {
          statusCode: 500,
          error: "Something went wrong."
        }
      });
    }

    const sms = africastalking.SMS;
    await sms.send({
      to: [`+${req.body.phone_number}`],
      message: `Your number verification to MyCustomer is ${otpSaveResult.otp_code}`
    })

    res.status(200).json({
      success: true,
      message: "successful",
      data: {
        message: "successful"
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong.",
      data: {
        statusCode: 500,
        error: err
      }
    });
  }
};

exports.verify = async (req, res) => {
  try {
    let user = await UserModel.findOne({ identifier: req.body.phone_number });

    if(!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          error: "User not found"
        }
      });
    }

    const otp = await OTP.findOne({ user_ref_code: user._id });

    if(!otp || otp.otp_code != req.body.verify) {
      return res.status(404).json({
        success: false,
        message: "OTP not found",
        data: {
          statusCode: 404,
          error: "OTP not found"
        }
      });
    }

    user.local.is_active = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "successful",
      data: {
        message: "successful"
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong.",
      data: {
        statusCode: 500,
        error: err
      }
    });
  }
};

function makeid(length) {
  //const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const characters = "0123456789";
  const charactersLength = characters.length;
  let result = "";
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
