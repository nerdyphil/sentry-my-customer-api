const express = require("express");
const router = express.Router();
const GoogleController = require("../controllers/google.controller");

router.get("/google/signin", GoogleController.urlGoogle);
router.get("/google/callback", GoogleController.getGoogleAccountFromCode);

module.exports = router;
