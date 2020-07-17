const express = require("express");
const Reset = require("../controllers/reset.controller.js");
const bodyValidator = require("../util/body_validator");

const router = express.Router();

router.post(
  "/recover",
  Reset.validate("recover"),
  bodyValidator,
  Reset.recover
);

router.post(
  "/reset",
  Reset.validate("reset"),
  bodyValidator,
  Reset.resetPassword
);

module.exports = router;
