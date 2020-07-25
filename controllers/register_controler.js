const jwt = require("jsonwebtoken");
const bCrypt = require("bcryptjs");
const { body } = require("express-validator/check");

const UserModel = require("../models/store_admin");
const CustomerModel = require("../models/customer");

exports.validate = (method) => {
  switch (method) {
    case "body": {
      return [
        body("phone_number").isInt(),
        body("phone_number").isMobilePhone(),
        body("password").isLength({ min: 6 }),
      ];
    }
  }
};

//  Register User
module.exports.registerUser = async (req, res, next) => {
  const { password, phone_number, user_role } = req.body;

  //  Create a Token that will be passed as the "api_token"
  const token = jwt.sign(
    {
      phone_number: phone_number,
      user_role: "store_admin",
    },
    process.env.JWT_KEY,
    {
      expiresIn: "1d",
    }
  );

  //  Get instance of the
  const user = new UserModel({});
  user.local.phone_number = phone_number;
  user.local.password = password;

  // TO REGISTER A SUPER ADMIN, USER ROLE IS NEEDED AS A REQUEST
  user.local.user_role = user_role || "store_admin";

  user.api_token = token;
  user.identifier = phone_number;
  //  Encrypt the Password
  user.local.password = await bCrypt.hash(user.local.password, 10);

  //  Check if User PhoneNumber and Email already exist.
  UserModel.findOne({
    identifier: user.identifier,
  })
    .then((existingUser) => {
      if (existingUser) {
        //  This means the user exists.
        return res.status(409).json({
          success: false,
          message: "User already exists",
          error: {
            statusCode: 409,
            description:
              "Phone number already taken, please use another phone number",
          },
        });
      } else {
        //  Save to the DB.
        user
          .save()
          .then((result) => {
            res.status(201).json({
              success: true,
              message: "User registration successfull",
              data: {
                statusCode: 201,
                user: result,
              },
            });
          })
          .catch((error) => {
            return res.status(500).json({
              success: false,
              message: "Internal error",
              error: {
                statusCode: 500,
                description: error,
              },
            });
          });
      }
    })
    .catch((error) => {
      res.status(500).json({
        success: false,
        message: "Internal error",
        error: {
          statusCode: 500,
          description: error,
        },
      });
    });
};

//  Register Customer
module.exports.registerCustomer = async (req, res, next) => {
  const { name, phone_number } = req.body;

  const reqBody = {
    phone_number: phone_number,
    name: name,
  };

  //Validate the "reqBody" object using joiValidator function imported.
  const { error, value } = await joiValidator.customerValidator.validate(
    reqBody
  );
  //  Check if there is any validation error.
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Bad request",
      error: {
        statusCode: 400,
        description: error.details[0].message,
      },
    });
  }

  //  Get instance of the
  const customer = new CustomerModel({
    name: value.name,
    phone_number: value.phone_number,
    /*store_ref_code: store_ref_code,*/
  });

  //  Check if User PhoneNumber already exist.
  await UserModel.findOne({ phone_number: customer.phone_number })
    .then((existingUser) => {
      if (existingUser) {
        //  This means the user exists.
        return res.status(200).json({
          message:
            "Phone number already taken. Please use another phone number.",
        });
      } else {
        //  Save to the DB.
        customer
          .save()
          .then((result) => {
            return res.status(201).json({
              message: "Customer registered successfully...",
              Customer: {
                _id: result._id,
                name: result.name,
                phone_number: result.phone_number,
                store_ref_code: result.store_ref_code,
              },
            });
          })
          .catch((error) => {
            return res.status(500).json({
              Error: error,
            });
          });
      }
    })
    .catch((error) => {
      res.status(500).json({
        Error: error,
      });
    });
};
