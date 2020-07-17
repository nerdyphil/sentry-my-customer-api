const express = require("express");
const router = express.Router();
const emailController = require("./../controllers/emailController");
const auth = require("../auth/auth");

router.post("/reminder/email/:customer_id", auth, emailController.sendMail());

module.exports = router;
