const jwt = require("jsonwebtoken");
const bCrypt = require("bcryptjs");
const { body } = require("express-validator/check");
const Activity = require("../models/activity");
const UserModel = require("../models/store_admin");
const AssistantModel = require("../models/storeAssistant");
const CustomerModel = require("../models/customer");
const StoreModel = require("../models/store");
var onFinished = require("on-finished");

exports.validate = method => {
  switch (method) {
    case "login": {
      return [body("phone_number").isInt(), body("password")];
    }
  }
};

module.exports.errorHandler = (error, res) => {
  let message = "Internal Server Error.";
  let status = 500;
  if (error.name && error.name.toLowerCase().includes("validationerror")) {
    message = "request missing required fields";
    status = 422;
  }
  if (error.name && error.name.toLowerCase().includes("casterror")) {
    message = "invalid id";
    status = 400;
  }
  return res.status(status).json({
    success: false,
    message,
    error: {
      statusCode: status,
      message: error.message,
      description: {
        stack: error.stack,
        ...error
      }
    }
  });
};

//  TODO: Change expiry back to 1h
module.exports.signToken = (data, expiresIn = "24h") =>
  jwt.sign(data, process.env.JWT_KEY, {
    expiresIn
  });
const loginAssistant = async (req, { identifier, password }, res) => {
  let assistant = await AssistantModel.findOne({ phone_number: identifier })
    .populate({ path: "store_admin_ref" })
    .exec();
  if (assistant && (await bCrypt.compare(password, assistant.password))) {
    const apiToken = module.exports.signToken({
      phone_number: assistant.phone_number,
      // password: password,
      user_role: assistant.user_role,
      _id: assistant._id
    });
    if (!assistant.first_name || !assistant.last_name) {
      assistant.first_name = "Not";
      assistant.last_name = "Set";
    }
    assistant.api_token = apiToken;
    assistant = await assistant.save();
    return res.status(200).json({
      success: true,
      message: "You're logged in successfully.",
      data: {
        statusCode: 200,
        message: "Store Assistant logged in successfully.",
        user: {
          currencyPreference:
            (assistant.store_admin_ref &&
              assistant.store_admin_ref.currencyPreference) ||
            "ngn",
          local: assistant,
          _id: assistant._id,
          stores: [await StoreModel.findOne({ _id: assistant.store_id })],
          api_token: apiToken
        }
      }
    });
  }
  return res.status(401).json({
    success: false,
    message: "invalid credentials",
    error: {
      statusCode: 401
    }
  });
};
//  Login User
module.exports.loginUser = async (req, res) => {
  const { password, phone_number: identifier } = req.body;
  try {
    let user = await UserModel.findOne({ identifier });
    if (user) {
      if (user && (await bCrypt.compare(password, user.local.password))) {
        const apiToken = module.exports.signToken({
          phone_number: user.identifier,
          // password: user.local.password,
          user_role: user.local.user_role,
          _id: user._id
        });
        user.api_token = apiToken;
        user = await user.save();
        await onFinished(res, async (err, res) => {
          /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
          const {
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          } = req;
          /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
          await Activity.create({
            creator_ref: user._id,
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
        res.status(200).json({
          success: true,
          message: "You're logged in successfully.",
          data: {
            statusCode: 200,
            user: {
              ...user.toObject(),
              currencyPreference: user.currencyPreference || "ngn"
            }
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: "invalid credentials",
          error: {
            statusCode: 401
          }
        });
      }
    } else if (!user) {
      let assistant = await AssistantModel.findOne({
        phone_number: identifier
      })
        .populate({ path: "store_admin_ref" })
        .exec();
      if (assistant && (await bCrypt.compare(password, assistant.password))) {
        const apiToken = module.exports.signToken({
          phone_number: assistant.phone_number,
          // password: password,
          user_role: assistant.user_role,
          _id: assistant._id
        });
        assistant.api_token = apiToken;
        assistant = await assistant.save();
        await onFinished(res, async (err, res) => {
          /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
          const {
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          } = req;
          /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
          await Activity.create({
            creator_ref: assistant._id,
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
        return res.status(200).json({
          success: true,
          message: "You're logged in successfully.",
          data: {
            statusCode: 200,
            message: "Store Assistant logged in successfully.",
            user: {
              currencyPreference:
                (assistant.store_admin_ref &&
                  assistant.store_admin_ref.currencyPreference) ||
                "ngn",
              local: assistant,
              _id: assistant._id,
              stores: [await StoreModel.findOne({ _id: assistant.store_id })],
              api_token: apiToken,
              image: assistant.image
            }
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: "invalid credentials",
          error: {
            statusCode: 401
          }
        });
      }
    }
  } catch (error) {
    module.exports.errorHandler(error, res);
  }
};

//  Login Assistant
module.exports.loginAssistant = async (req, res) => {
  const { password, phone_number: identifier } = req.body;
  try {
    await loginAssistant({ identifier, password }, res);
  } catch (error) {
    module.exports.errorHandler(error, res);
  }
};

//  Login Customer
module.exports.loginCustomer = async (req, res, next) => {
  const { name, phone_number } = req.body;

  //  Get instance of the
  const user = CustomerModel({
    name,
    phone_number
  });

  //  Check if the users phone persists in the DB
  await CustomerModel.findOne({ phone_number: user.phone_number })
    .then(userExist => {
      if (userExist) {
        //  Go ahead to generate a login api_token for subsequent authentication..
        const apiToken = module.exports.signToken({
          phone_number: userExist.phone_number,
          name: userExist.name,
          _id: userExist._id
        });

        res.status(200).json({
          message: "You're logged in successfully.",
          api_token: apiToken,
          success: true,
          user: {
            _id: userExist._id,
            phone_number: userExist.phone_number,
            name: userExist.name
          }
        });
      } else {
        res.json({
          message: "Invalid credentials.",
          success: false
        });
      }
    })
    .catch(error => {
      module.exports.errorHandler(error, res);
    });
};

module.exports.login;
