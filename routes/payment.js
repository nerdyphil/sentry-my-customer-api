const express = require("express");
const router = express.Router();
const paymentController = require("./../controllers/payment.controller.js");
const bodyValidator = require("../util/body_validator");

const auth = require("../auth/auth");
//router.use("/payment", auth)

router.post("/payment/new/:transaction_id", paymentController.create);

module.exports = router;
