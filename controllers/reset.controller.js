const User = require("../models/store_admin");
const bCrypt = require("bcryptjs");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
});

module.exports.recover = async (req, res) => {
  console.log(req.body.phone_number);
  const userr = await new User({});
  userr.local.phone_number = req.body.phone_number;
  userr.local.password = req.body.password;
  userr.identifier = req.body.phone_number;
  User.findOne({ identifier: userr.identifier })
    .then(user => {
      if (!user)
        return res.status(401).json({
          message:
            "The phone number is not associated with any account. Double-check your phone number and try again."
        });

      //Generate and set password reset token
      user.generatePasswordReset();
      console.log(user.resetPasswordToken);

      // Save the updated user object
      user
        .save()
        .then(user => {
          const sms = africastalking.SMS;
          sms
            .send({
              to: [`+${user.local.phone_number}`],
              message: `Your number verification to MyCustomer is ${user.resetPasswordToken}`
            })
            .then(response => {
              console.log(response);
              res.status(200).json({
                success: true,
                message: "successful",
                data: {
                  message: "Reset token sent successfully"
                }
              });
            })
            .catch(error => {
              console.log(error);
              res.status(500).json({
                success: false,
                message: "Something went wrong.",
                data: {
                  statusCode: 500,
                  error: "Something went wrong."
                }
              });
            });
        })
        .catch(err => res.status(500).json({ message: err.message }));
    })
    .catch(err => res.status(500).json({ message: err.message }));
};


module.exports.reset = async (req, res) => {
  User.findOne({
    resetPasswordToken: req.body.resetPasswordToken,
    resetPasswordExpires: { $gt: Date.now() }
  })
    .then(user => {
      if (!user)
        return res
          .status(401)
          .json({ message: "Password reset token is invalid or has expired." });

      //Redirect user to form with the email address
      res.render("reset", { user });
    })
    .catch(err => res.status(500).json({ message: err.message }));
};


module.exports.resetPassword = async (req, res, next) => {
  const user = await User.findOne({
    resetPasswordToken: req.body.token,
    resetPasswordExpires: { $gt: Date.now() }
  }).then(user => {
    if (!user)
      return res
        .status(401)
        .json({ message: "Password reset token is invalid or has expired." });
    return user;
  });

  //Set the new password
  user.local.password = req.body.password;
  user.local.password = await bCrypt.hash(user.local.password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  // Save
  user.save(err => {
    if (err)
      return res.status(500).json({
        success: false,
        message: "Something went wrong.",
        data: {
          statusCode: 500,
          error: "Something went wrong."
        }
      });
  });

  const sms = africastalking.SMS;
  sms
    .send({
      to: [`+${user.local.phone_number}`],
      message: `Your password has been successfully changed.`
    })
    .then(response => {
      console.log(response);
      res.status(200).json({
        success: true,
        message: "successful",
        data: {
          message: "successful"
        }
      });
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({
        success: false,
        message: "Something went wrong.",
        data: {
          statusCode: 500,
          error: "Something went wrong."
        }
      });
    });
};
