const jwt = require("jsonwebtoken");
const bCrypt = require("bcryptjs");
const { body } = require("express-validator/check");
const Activity = require("../models/activity");
const onFinished = require("on-finished");
const UserModel = require("../models/store_admin");
const AssistantModel = require("../models/storeAssistant");
const CustomerModel = require("../models/customer");
const { signToken, errorHandler } = require("./login_controler");

exports.validate = method => {
  switch (method) {
    case "body": {
      return [
        body("phone_number").isInt(),
        body("password").isLength({ min: 6 })
      ];
    }
  }
};

//  Register User
module.exports.registerUser = async (req, res) => {
  let {
    password,
    phone_number: identifier,
    user_role = "store_admin"
  } = req.body;

  try {
    //  Duplicate check
    let user = await UserModel.findOne({ identifier });
    let assistant = await AssistantModel.findOne({ phone_number: identifier });
    if (user) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
        error: {
          statusCode: 409,
          description:
            "Phone number already taken, please use another phone number"
        }
      });
    } else if (assistant) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
        error: {
          statusCode: 409,
          description:
            "An Assistant already has this number, Please use another number"
        }
      });
    }
    password = await bCrypt.hash(password, 10);
    user = await UserModel.create({
      identifier,
      local: { phone_number: identifier, password, user_role }
    });
    const api_token = signToken({
      phone_number: identifier,
      user_role,
      _id: user._id
    });
    user.api_token = api_token;
    user = await user.save();
    await onFinished(res, async (err, res) => {
      /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
      const { method, originalUrl, httpVersion, headers, body, params } = req;
      /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
      await Activity.create({
        creator_ref: req.user._id,
        method,
        originalUrl,
        httpVersion,
        headers,
        body,
        params
      });
      // const activity = await Activity.findOne({"body.phone_number": "2348136814497"});
      // console.log(activity);
    });
    return res.status(201).json({
      success: true,
      message: "User registration successfull",
      data: {
        statusCode: 201,
        user
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

//  Register Customer
module.exports.registerCustomer = async (req, res) => {
  const { name, phone_number, email } = req.body;

  try {
    let customer = await CustomerModel.findOne({ phone_number });
    if (customer) {
      return res.status(409).json({
        message: "Phone number already taken. Please use another phone number.",
        success: false,
        error: {
          statusCode: 409
        }
      });
    }
    customer = await CustomerModel.create({ phone_number, name, email });
    await onFinished(res, async (err, res) => {
      /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
      const { method, originalUrl, httpVersion, headers, body, params } = req;
      /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
      await Activity.create({
        creator_ref: req.user._id,
        method,
        originalUrl,
        httpVersion,
        headers,
        body,
        params
      });
      // const activity = await Activity.findOne({"body.phone_number": "2348136814497"});
      // console.log(activity);
    });
    return res.status(201).json({
      success: true,
      message: "Customer registered successfully...",
      Customer: {
        _id: customer._id,
        name,
        phone_number,
        store_ref_id: customer.store_ref_id
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
