const express = require('express');
const LoginController = require('../controllers/login_controler');
const bodyValidator = require('../util/body_validator')

const router = express.Router();

//User login route
router.post('/user', LoginController.validate('login'), bodyValidator, LoginController.loginUser);

//Customer login route
router.post('/customer', LoginController.loginCustomer);

//Assistant login route
router.post('/assistant', LoginController.loginAssistant);

module.exports = router;
