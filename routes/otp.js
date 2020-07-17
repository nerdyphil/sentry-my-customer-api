const express = require("express");
const router = express.Router();
const bodyValidator = require("../util/body_validator");
const otpController = require("./../controllers/otp.controller");
const auth = require("../auth/auth");

router.post(
  "/otp/send",
  otpController.validate("send"),
  bodyValidator,
  otpController.send
);
router.post(
  "/otp/verify",

  otpController.validate("verify"),
  bodyValidator,
  otpController.verify
);

module.exports = router;
