const jwt = require("jsonwebtoken");
const bCrypt = require("bcryptjs");
const { body } = require("express-validator/check");

const UserModel = require("../models/store_admin");
const CustomerModel = require("../models/customer");

exports.validate = (method) => {
  switch (method) {
    case "login": {
      return [body("phone_number").isInt(), body("password")];
    }
  }
};

//  Login User
module.exports.loginUser = async (req, res, next) => {
  const { password, phone_number } = req.body;

  //  Get instance of the
  const user = UserModel({});
  user.local.phone_number = phone_number;
  user.local.password = password;
  user.identifier = phone_number;

  //  Check if the users phone persists in the DB
  await UserModel.findOne({ identifier: phone_number })
    .then((userExist) => {
      if (userExist) {
        //  Go ahead to compare the password match.
        bCrypt
          .compare(user.local.password, userExist.local.password)
          .then((doPasswordMatch) => {
            if (doPasswordMatch) {
              //  Generate a login api_token for subsequent authentication.
              const apiToken = jwt.sign(
                {
                  phone_number: userExist.identifier,
                  password: user.local.password,
                  user_role: userExist.local.user_role,
                },
                process.env.JWT_KEY,
                {
                  expiresIn: "24h",
                }
              );
              userExist.api_token = apiToken;
              userExist.save();
              res.status(200).json({
                success: true,
                message: "You're logged in successfully.",
                data: {
                  statusCode: 200,
                  user: userExist,
                },
              });
            } else {
              res.status(401).json({
                success: false,
                message: "Invalid Password.",
                error: {
                  code: 401,
                  description: "Invalid Password",
                },
              });
            }
          })
          .catch((error) => {
            res.status(500).json({
              success: false,
              message: error,
              error: {
                code: 500,
                description: error,
              },
            });
          });
      } else {
        try {
          UserModel.findOne({
            "assistants.phone_number": phone_number,
          })
            .then((user) => {
              const storeAssistants = user.assistants;

              storeAssistants.forEach((storeAssistant) => {
                if (storeAssistant.phone_number == phone_number) {
                  user.stores.forEach((store) => {
                    if (store._id == storeAssistant.store_id) {
                      bCrypt
                        .compare(password, storeAssistant.password)
                        .then((doPasswordMatch) => {
                          if (doPasswordMatch) {
                            const apiToken = jwt.sign(
                              {
                                phone_number: phone_number,
                                password: password,
                                user_role: storeAssistant.user_role,
                              },
                              process.env.JWT_KEY,
                              {
                                expiresIn: "24h",
                              }
                            );
                            storeAssistant.api_token = apiToken;
                            user.save();
                            // var lm = storeAssistant
                            storeAssistant.first_name = storeAssistant.name;
                            storeAssistant.last_name = storeAssistant.name;
                            // storeAssistant.user_role = "store_admin"
                            return res.status(200).json({
                              success: true,
                              message: "You're logged in successfully.",
                              data: {
                                statusCode: 200,
                                message:
                                  "Store Assistant logged in successfully.",
                                user: {
                                  local: storeAssistant,
                                  _id: storeAssistant._id,
                                  stores: [store],
                                  api_token: storeAssistant.api_token,
                                },
                              },
                            });
                          } else {
                            return res.status(401).json({
                              success: false,
                              message: "Invalid Password.",
                              error: {
                                code: 401,
                                description: "Invalid Password",
                              },
                            });
                          }
                        });
                    }
                  });
                }
              });
            })
            .catch((error) => {
              return res.status(500).json({
                success: "false",
                message: "Internal Server Error.",
                error: {
                  statusCode: 500,
                  message: "Internal Server Error.",
                },
              });
            });
        } catch {
          res.status(404).json({
            success: false,
            message: "User does not exist",
            error: {
              code: 404,
              description: "User does not exist",
            },
          });
        }
      }
    })
    .catch((error) => {
      res.status(500).json({
        success: false,
        message: "An internal error occurred",
        error: {
          statusCode: 500,
          description: error,
        },
      });
    });
};

module.exports.loginAssistant = async (req, res, next) => {
  const { password, phone_number } = req.body;

  //console.log(password, phone_number);
  await UserModel.findOne({
    "assistants.phone_number": phone_number,
  })
    .then((user) => {
      const storeAssistants = user.assistants;

      storeAssistants.forEach((storeAssistant) => {
        if (storeAssistant.phone_number == phone_number) {
          user.stores.forEach((store) => {
            if (store._id == storeAssistant.store_id) {
              bCrypt
                .compare(password, storeAssistant.password)
                .then((doPasswordMatch) => {
                  if (doPasswordMatch) {
                    const apiToken = jwt.sign(
                      {
                        phone_number: phone_number,
                        password: password,
                        user_role: storeAssistant.user_role,
                      },
                      process.env.JWT_KEY,
                      {
                        expiresIn: "24h",
                      }
                    );
                    storeAssistant.api_token = apiToken;
                    user.save();
                    return res.status(200).json({
                      success: true,
                      message: "You're logged in successfully.",
                      data: {
                        statusCode: 200,
                        message: "Store Assistant retrieved successfully.",
                        user: storeAssistant,
                        store: store,
                      },
                    });
                  } else {
                    return res.status(401).json({
                      success: false,
                      message: "Invalid Password.",
                      error: {
                        code: 401,
                        description: "Invalid Password",
                      },
                    });
                  }
                });
            }
          });
        }
      });
    })
    .catch((error) => {
      return res.status(500).json({
        success: "false",
        message: "Internal Server Error.",
        error: {
          statusCode: 500,
          message: "Internal Server Error.",
        },
      });
    });
};

//  Login Customer
module.exports.loginCustomer = async (req, res, next) => {
  const { name, phone_number } = req.body;

  const reqBody = {
    phone_number: phone_number,
    name: name,
  };

  //Validate the "reqBody" object using joiValidator function imported.
  const { error, value } = await joiValidator.userLoginValidator.validate(
    reqBody
  );
  //  Check if there is any validation error.
  if (error) {
    return res.status(400).json({
      success: false,
      message: "An internal error occurred",
      error: {
        statusCode: 400,
        description: error.details[0].message,
      },
    });
  }

  //  Get instance of the
  const user = CustomerModel({
    name: value.name,
    phone_number: value.phone_number,
  });

  //  Check if the users phone persists in the DB
  await CustomerModel.findOne({ phone_number: user.phone_number })
    .then((userExist) => {
      if (userExist) {
        //  Go ahead to generate a login api_token for subsequent authentication..
        const apiToken = jwt.sign(
          {
            phone_number: userExist.phone_number,
            name: userExist.name,
          },
          process.env.JWT_KEY,
          {
            expiresIn: "24h",
          }
        );

        res.status(200).json({
          message: "You're logged in successfully.",
          api_token: apiToken,
          status: true,
          user: {
            _id: userExist._id,
            phone_number: userExist.phone_number,
            name: userExist.name,
          },
        });
      } else {
        res.json({
          message: "Invalid phone number.",
          Status: false,
        });
      }
    })
    .catch((error) => {
      res.status(500).json({
        Error: error,
      });
    });
};

module.exports.login;
