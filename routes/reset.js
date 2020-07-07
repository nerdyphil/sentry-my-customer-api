const express = require('express');
const Reset = require("../controllers/reset.controller.js");

const router = express.Router();

router.post('/recover', Reset.recover);

router.post('/reset', Reset.resetPassword);

module.exports = router;
