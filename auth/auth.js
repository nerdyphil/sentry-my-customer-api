var jwt = require("jsonwebtoken");
var config = process.env;
const UserModel = require("../models/store_admin");
const AssistantModel = require("../models/storeAssistant");
const CustomerModel = require("../models/customer");

const verifyToken = (req, res, next) => {
  var token =
    req.body.token || req.query.token || req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({
      success: false,
      message: "Token is required for verification",
      error: {
        statusCode: 403,
        auth: false,
        description: "You must provide a token to authenticate your call",
      },
    });
  }

  jwt.verify(token, config.JWT_KEY, async function (err, decoded) {
    if (err) {
      return res.status(401).send({
        success: false,
        message: "Invalid Token",
        error: {
          statusCode: 401,
          auth: false,
          description: "You entered an invalid token",
        },
      });
    }

    req.user = decoded;
    if (!decoded.user_role) {
      let user = await CustomerModel.findOne({ _id: req.user._id });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "unauthorized access",
          errors: {
            statusCode: 401,
          },
        });
      }
    } else if (decoded.user_role.toLowerCase().includes("store_assistant")) {
      try {
        let user = await AssistantModel.findOne({ _id: req.user._id });
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "unauthorized access",
            errors: {
              statusCode: 401,
            },
          });
        }
        req.user.store_admin_ref = user.store_admin_ref;
        req.user.store_id = user.store_id;
      } catch (error) {
        return require("../controllers/login_controler").errorHandler(
          error,
          res
        );
      }
    } else if (decoded.user_role.toLowerCase().includes("store_admin")) {
      req.user.store_admin_ref = req.user._id;
    }
    // console.log(req.user);
    next();
  });
};

module.exports = verifyToken;
