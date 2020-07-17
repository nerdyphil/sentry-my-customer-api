const express = require("express");
const storeAssistantController = require('../controllers/storeAssistant');
const auth = require('../auth/auth');

const router = express.Router();

router.post("/store_assistant/new", auth, storeAssistantController.createStoreAssistant);

module.exports = router;