const User = require("../models/store_admin");
const StoreAssistant = require("../models/storeAssistant");
const Store = require("../models/store");
const customersModel = require("../models/customer");
const transactionsModel = require("../models/transaction");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator/check");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const _ = require("lodash");
const Activity = require("../models/activity");
const onFinished = require("on-finished");
const responseManager = require("../util/response_manager");
const DataUri = require("datauri/parser");
const path = require("path");
const { errorHandler } = require("./login_controler");
const { transactionService } = require("../services");
const storeAssistant = require("../models/storeAssistant");

exports.validate = method => {
  switch (method) {
    case "body": {
      return [
        body("phone_number").isInt(),
        body("name").matches(/^[0-9a-zA-Z ]{2,}$/, "i")
      ];
    }

    case "password":
      return [
        body("old_password").isString(),
        body("new_password")
          .isString()
          .isLength({ min: 6 })
          .withMessage("Password must be 6 characters long")
      ];

    case "store_admin": {
      return [
        body("phone_number").isInt(),
        body("first_name").isString(),
        body("last_name").isString(),
        body("email").isEmail()
      ];
    }
  }
};

const util = {
  //utility functions
  compareTransactions: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.createdAt.getTime() > b.createdAt.getTime()) return -1;
    if (b.createdAt.getTime() < a.createdAt.getTime()) return 1;

    return 0;
  },

  compareCustomers: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (
      a.transactions[0].createdAt.getTime() >
      b.transactions[0].createdAt.getTime()
    )
      return -1;
    if (
      b.transactions[0].createdAt.getTime() <
      a.transactions[0].createdAt.getTime()
    )
      return 1;

    return 0;
  },

  compareRecentTransactions: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.transaction.createdAt.getTime() > b.transaction.createdAt.getTime())
      return -1;
    if (b.transaction.createdAt.getTime() < a.transaction.createdAt.getTime())
      return 1;

    return 0;
  },

  compareRecentDebts: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.debt.createdAt.getTime() > b.debt.createdAt.getTime()) return -1;
    if (b.debt.createdAt.getTime() < a.debt.createdAt.getTime()) return 1;

    return 0;
  },

  getTransactionForMonth: (obj, data) => {
    try {
      const transactionDate = new Date(obj.transaction.transaction.createdAt);
      const currentDate = new Date();
      if (currentDate.getFullYear() == transactionDate.getFullYear()) {
        data[transactionDate.getMonth()] += parseFloat(
          obj.transaction.transaction.amount
        );
      }
    } catch (error) {
      data[0] += 0;
    }

    return data;
  }
};
// Get all Users.
exports.allStoreAssistant = async (req, res) => {
  try {
    let assistants;
    if (req.user.user_role === "super_admin") {
      assistants = await StoreAssistant.find({})
        .select("-password")
        .exec();
    } else {
      assistants = await StoreAssistant.find({ store_admin_ref: req.user._id })
        .select("-password")
        .exec();
    }
    return res.status(200).json({
      success: "true",
      message: "Store assistants retrieved successfully.",
      data: {
        status: 200,
        message: "Store assistants retrieved successfully.",
        assistants
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Add new StoreAdmin
exports.newStoreAdmin = async (req, res) => {
  const { name, email, password, phone_number } = req.body;
  try {
    let user = await User.findOne({ identifier: phone_number });
    if (user) {
      return res.status(200).json({
        success: false,
        message: "User already exist.",
        data: {
          status: 200,
          message: "User already exist."
        }
      });
    }
    user = await User.create({
      identifier: phone_number,
      local: {
        name,
        phone_number,
        email,
        password
      }
    });
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
      message: "User created successfully.",
      data: {
        status: 201,
        message: "User created successfully.",
        user
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Add new StoreAssistant
exports.newStoreAssistant = async (req, res) => {
  const { name, email, password, phone_number, store_id } = req.body;
  try {
    let store;
    if (req.user.user_role === "super_admin") {
      store = await Store.findOne({ _id: store_id });
    } else {
      store = await Store.findOne({
        store_admin_ref: req.user._id,
        _id: store_id
      });
    }
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store does not exist.",
        data: {
          status: 404,
          message: "Store does not exist."
        }
      });
    }
    let store_assistant = await StoreAssistant.findOne({
      store_admin_ref: req.user._id,
      phone_number
    });
    if (store_assistant) {
      return res.status(409).json({
        success: false,
        message: "assistant already exists",
        error: {
          statusCode: 409
        }
      });
    } else if (req.user.phone_number == phone_number) {
      return res.status(409).json({
        success: false,
        message: "You can't be an assistant to yourself",
        error: {
          statusCode: 409
        }
      });
    }
    store_assistant = await StoreAssistant.create({
      store_admin_ref: req.user._id,
      name,
      phone_number,
      store_id,
      email,
      password: await bcrypt.hash(password, 10)
    });
    await store.save();
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
      message: "StoreAssistant created successfully.",
      data: {
        status: 201,
        message: "StoreAssistant created successfully.",
        store_assistant
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Get Single Store Assistant with assistant_id.
exports.getSingleStoreAssistant = async (req, res) => {
  const data = {};
  try {
    const store_assistant = await StoreAssistant.findOne({
      _id: req.params.assistant_id
    })
      .select("-password")
      .exec();
    if (!store_assistant) {
      return res.status(404).json({
        success: false,
        message: "cannot find assistant",
        error: {
          statusCode: 404
        }
      });
    }
    data.user = store_assistant;
    const assistantStore_id = store_assistant.store_id;
    const assistantStore = await Store.findOne({ _id: assistantStore_id });
    data.storeName = assistantStore.store_name;
    data.storeAddress = assistantStore.shop_address;
    data.customerCount = 0;
    data.transactionCount = 0;
    data.recentTransactions = [];
    data.chart = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    data.debtCount = 0;
    data.debtAmount = 0;
    data.revenueCount = 0;
    data.revenueAmount = 0;
    data.receivablesAmount = 0;
    data.amountForCurrentMonth = 0;
    data.amountForPreviousMonth = 0;
    const assistantstore_customers = await customersModel.find({
      store_ref_id: assistantStore_id
    });
    assistantstore_customers.forEach(async customer => {
      data.customerCount += 1;
      customerTransactions = await transactionsModel
        .find({
          customer_ref_id: customer._id
        })
        .populate({ path: "store_ref_id" })
        .exec();
      customerTransactions.forEach(transaction => {
        if (transaction.assistant_inCharge == store_assistant._id) {
          data.transactionCount += 1;
          let obj = {};
          obj.customerName = customer.name;
          obj.storeName = assistantStore.store_name;
          obj.transaction = transaction;
          obj.recentTransactions.push(obj);

          data.chart = util.getTransactionForMonth(obj, data.chart);

          if (
            transaction.type.toLowerCase() == "debt" &&
            transaction.status == false
          ) {
            data.debtCount += 1;
            try {
              data.debtAmount += parseFloat(transaction.amount);
            } catch (error) {
              data.debtAmount += 0;
            }
          }
          if (transaction.status == true) {
            data.revenueCount + 1;
            try {
              data.revenueAmount += parseFloat(transaction.amount);
            } catch (error) {
              data.revenueAmount += 0;
            }
            let date = new Date();
            let transactionDate = new Date(transaction.createdAt);
            //get revenue for current month
            if (
              date.getMonth() == transactionDate.getMonth() &&
              date.getFullYear() == transactionDate.getFullYear()
            ) {
              try {
                data.amountForCurrentMonth += parseFloat(transaction.amount);
              } catch (error) {
                data.amountForCurrentMonth += 0;
              }
            }
            //get revenue for previous month
            if (
              date.getMonth() - 1 == transactionDate.getMonth() &&
              date.getFullYear() == transactionDate.getFullYear()
            ) {
              try {
                data.amountForPreviousMonth += parseFloat(transaction.amount);
              } catch (error) {
                data.amountForPreviousMonth += 0;
              }
            }
          }
          if (transaction.type.toLowerCase() == "receivables") {
            data.receivablesCount += 1;
            try {
              data.receivablesAmount += parseFloat(transaction.amount);
            } catch (error) {
              data.receivablesAmount += 0;
            }
          }
        }
      });
    });
    //sort transactions by time
    data.recentTransactions = data.recentTransactions
      .sort(util.compareRecentTransactions)
      .slice(0, 15);
    return res.status(200).json({
      success: true,
      status: 200,
      message: "Store Assistant data.",
      data
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

const updateAssistant = async (res, req, store_assistant) => {
  const { name, phone_number, email, store_id } = req.body;
  if (phone_number) {
    const check =
      (await StoreAssistant.findOne({
        phone_number,
        _id: { $ne: store_assistant._id }
      })) || (await User.findOne({ identifier: phone_number }));
    if (check) {
      return res.status(400).json({
        success: false,
        message: "Phone number is already taken",
        error: {
          statusCode: 400
        }
      });
    }
  }
  store_assistant.name = name || store_assistant.name;
  store_assistant.phone_number = phone_number || store_assistant.phone_number;
  store_assistant.email = email || store_assistant.email;
  store_assistant.store_id = store_id || store_assistant.store_id;
  store_assistant = await store_assistant.save();
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
    message: "Store Assistant updated successfully.",
    data: {
      status: 201,
      message: "Store Assistant updated successfully.",
      store_assistant
    }
  });
};
//  Update Single Store Assistant with assistant_id.
exports.updateSingleStoreAssistant = async (req, res) => {
  try {
    let store_assistant = await StoreAssistant.findOne({
      _id: req.params.assistant_id,
      store_admin_ref: req.user._id
    });
    if (!store_assistant) {
      return res.status(404).json({
        success: false,
        message: "cannot find assistant",
        error: {
          statusCode: 404
        }
      });
    }
    return await updateAssistant(res, req, store_assistant);
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.updateSelfAssistant = async (req, res) => {
  try {
    let store_assistant = await StoreAssistant.findOne({
      _id: req.user._id
    });

    if (!store_assistant) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
        error: {
          statusCode: 401
        }
      });
    }

    return await updateAssistant(res, req, store_assistant);
  } catch (error) {
    errorHandler(error, res);
  }
};

//  Delete Single Store Assistant with assistant_id.
exports.deleteSingleStoreAssistant = async (req, res) => {
  try {
    let store_assistant = await StoreAssistant.findOne({
      _id: req.params.assistant_id,
      store_admin_ref: req.user._id
    });
    if (!store_assistant) {
      return res.status(404).json({
        success: false,
        message: "cannot find assistant",
        error: {
          statusCode: 404
        }
      });
    }
    await store_assistant.remove();
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
    return res.status(200).json({
      success: "true",
      message: "Assistant deleted successfully.",
      error: {
        statusCode: 200,
        message: "Assistant deleted successfully.",
        data: store_assistant
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
//#endregion

exports.updateBankDetails = (req, res) => {
  const identifier = req.user.phone_number;
  let { account_number, account_name, bank, currencyPreference } = req.body;
  User.findOne({ identifier })
    .then(async user => {
      user.bank_details.account_number =
        account_number || user.bank_details.account_number;
      user.bank_details.bank = bank || user.bank_details.bank;
      user.bank_details.account_name =
        account_name || user.bank_details.account_name;
      user.currencyPreference = currencyPreference || user.currencyPreference;

      user
        .save()
        .then(async result => {
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
          res.status(200).json({
            success: true,
            message: "Bank Details updated successfully",
            data: {
              user: result
            }
          });
        })
        .catch(error => {
          res.status(500).json({
            status: false,
            message: error.message,
            error: {
              code: 500,
              message: error.message
            }
          });
        });
    })
    .catch(error => {
      res.status(500).json({
        status: false,
        message: error.message,
        error: {
          code: 500,
          message: error.message
        }
      });
    });
};

exports.updateStoreAdmin = async (req, res) => {
  try {
    const update = { local: { ...req.body } };
    let user = await User.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized" + req.user._id,
        error: {
          statusCode: 401
        }
      });
    }
    _.merge(user, update);
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
    return res.status(200).json({
      success: true,
      message: "account updated",
      data: {
        store_admin: user
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.updatePassword = async (req, res) => {
  const errorResponse = err => {
    return res.status(500).json({
      success: false,
      message: "Error updating password",
      status: 500,
      error: {
        statusCode: 500,
        message: err.message
      }
    });
  };
  const { old_password, new_password, confirm_password } = req.body;
  const identifier = req.user.phone_number;
  let user;
  const store_admin = await User.findOne({ identifier });
  const store_assistant = await storeAssistant.findOne({
    phone_number: identifier
  });
  if (store_admin) user = await store_admin;
  else if (store_assistant) user = await store_assistant;

  if (confirm_password !== new_password) {
    return res.status(400).json({
      sucess: false,
      message: "confirm password should match new password",
      error: {
        statusCode: 400,
        message: "confirm password should match new password"
      }
    });
  }
  changePassword(user, res);

  async function changePassword(user, res) {
    const password = user.password || user.local.password;
    bcrypt.compare(old_password, password, function(err, result) {
      if (err) {
        console.log(err);
        return errorResponse(err);
      }
      if (!result)
        return errorResponse({
          message: "Passwords don't match"
        });
      bcrypt.hash(new_password, 10, (err, hash) => {
        if (user.local) user.local.password = hash;
        else if (user.password) user.password = hash;

        user
          .save()
          .then(async result => {
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
            res.status(200).json({
              success: true,
              message: "Password reset successful",
              data: {
                statusCode: 200,
                message: "Password reset successful"
              }
            });
          })
          .catch(err => errorResponse(err));
      });
    });
  }
};

exports.forgot = async (req, res, next) => {
  await crypto.randomBytes(20, function(err, buf) {
    let token = buf.toString("hex");
    if (err) {
      next(err);
    }

    User.findOne({ identifier: req.body.phone_number }, function(err, user) {
      if (err) {
        return res.status(404).json({
          success: "false",
          message: "Error finding user in DB",
          data: {
            statusCode: 404,
            error: err.message
          }
        });
      }
      if (!user) {
        return res.status(404).json({
          success: "false",
          message: "User Not Found. Make sure you inputted right phone number",
          data: {
            statusCode: 404,
            error: "User Dosen't Exist"
          }
        });
      }
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      user.save(
        err => {
          if (err) {
            return res.status(404).json({
              success: "false",
              message: "Error saving user",
              data: {
                statusCode: 404,
                error: err.message
              }
            });
          }
          let smtpTransport = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "openhand95@gmail.com",
              pass: "Juwon@1234"
            }
          });
          let mailOptions = {
            to: user.local.email,
            from: "passwordreset@mycustomer.com",
            subject: "Mycustomer Password Reset",
            text:
              "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
              "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
              "http://" +
              req.headers.host +
              "/store_admin/forgot-password/" +
              token +
              "\n\n" +
              "If you did not request this, please ignore this email and your password will remain unchanged.\n"
          };
          smtpTransport.sendMail(mailOptions, function(err, info) {
            if (err) {
              return res.status(400).json({
                success: "false",
                message: "Error sending email.Possibly User has no email",
                data: {
                  statusCode: 400,
                  error: err.message
                }
              });
            }
            return res.status(200).json({
              success: "true",
              message: "Email Sent" + info.response,
              data: {
                statusCode: 200,
                message:
                  "An e-mail has been sent to " +
                  user.local.email +
                  " with further instructions."
              }
            });
            // if (err) {
            //   next(err)
            // }
            // res.redirect('/store_admin/forgot-password');
          });
        },
        user => {
          let smtpTransport = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "openhand95@gmail.com",
              pass: "Juwon@1234"
            }
          });
          let mailOptions = {
            to: user.local.email,
            from: "passwordreset@mycustomer.com",
            subject: "Mycustomer Password Reset",
            text:
              "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
              "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
              "http://" +
              req.headers.host +
              "/reset/" +
              token +
              "\n\n" +
              "If you did not request this, please ignore this email and your password will remain unchanged.\n"
          };
          smtpTransport.sendMail(mailOptions, async (err, info) => {
            if (err) {
              return res.status(400).json({
                success: "false",
                message: "Error sending email. Possibly User has no email",
                data: {
                  statusCode: 400,
                  error: err.message
                }
              });
            }
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
            return res.status(200).json({
              success: "true",
              message: "Email Sent" + info.response,
              data: {
                statusCode: 200,
                message:
                  "An e-mail has been sent to " +
                  user.local.email +
                  " with further instructions."
              }
            });
            // if (err) {
            //   next(err)
            // }
            // res.redirect('/store_admin/forgot-password');
          });
        }
      );
    });
  });
};

exports.tokenreset = async (req, res) => {
  if (req.body.password === undefined || req.body.password == "") {
    return res.status(400).json({
      success: "false",
      message: "Password Can't Be Empty",
      data: {
        statusCode: 400,
        error: "password is required"
      }
    });
  }
  const password = await bcrypt.hash(req.body.password, 10);
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    },
    function(err, user) {
      if (err) {
        return res.status(400).json({
          success: "false",
          message: "Error From DB",
          data: {
            statusCode: 400,
            error: err.message
          }
        });
      }
      if (!user) {
        return res.status(400).json({
          success: "false",
          message: "Password Reset Token Is Invalid or has expired",
          data: {
            statusCode: 400,
            error: "Invalid Token"
          }
        });
      }
      user.local.password = password;
      user.resetPasswordToken = undefined; //turn reset password to something not needed
      user.resetPasswordExpires = undefined;

      user.save(function(err) {
        if (err) {
          return res.status(400).json({
            success: "false",
            message: "Couldn't save to DB",
            data: {
              statusCode: 400,
              error: err.message
            }
          });
        }
        let smtpTransport = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "openhand95@gmail.com",
            pass: "Juwon@1234"
          }
        });
        let mailOptions = {
          to: user.local.email,
          from: "mycustomer@customer.com",
          subject: "Your MyCustomer Account password has been changed",
          text:
            "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            user.email +
            " has just been changed.\n"
        };
        smtpTransport.sendMail(mailOptions, async err => {
          if (err) {
            return res.status(200).json({
              success: "false",
              message:
                "Password Changed Succesfully. But Error Sending Email Notification",
              data: {
                statusCode: 200,
                error: err.message
              }
            });
          }
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
          return res.status(200).json({
            success: "true",
            message: "Email Notification Sent",
            data: {
              statusCode: 200,
              message: "Password Changed Succesfully"
            }
          });
        });
      });
    }
  );
};

exports.updatePicture = (req, res) => {
  // check if an image is uploaded
  if (!req.file) {
    return responseManager.failure(res, { message: "Upload a picture" }, 400);
  }

  // use dataUri to convert image from buffer to dataUri
  let dturi = new DataUri();

  let dataUri = dturi.format(
    path.extname(req.file.originalname),
    req.file.buffer
  );
  const file = dataUri.content;
  // upload the image using cloudinary
  uploader
    .upload(file)
    .then(result => {
      // update the user image to this image
      User.updateOne(
        { identifier: req.user.phone_number },
        { $set: { image: result.url } }
      )
        .then(async dbResult => {
          // if the user is not found throw an error
          if (!dbResult.n) {
            return responseManager.failure(
              res,
              { message: "User not found" },
              404
            );
          }
          // successful response
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
          return responseManager.success(
            res,
            { message: `Image updated. New imgage url : ${result.url}` },
            200
          );
        })
        .catch(err => {
          console.log(err);
          return responseManager.failure(res, {
            message: "Picture not set. Unexpected error occured"
          });
        });
    })
    .catch(err => {
      console.log(err);
      return responseManager.failure(res, {
        message: "Picture not set. Unexpected error occured"
      });
    });
};

exports.deactivateUser = async (req, res) => {
  const id = req.user.phone_number;
  const storeAdminPhoneNumber = req.params.phone_number;

  const user = await User.findOne({ identifier: id });

  //   check if user exists
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      error: {
        statusCode: 404,
        message: "User not found"
      }
    });
  }

  //   check if user is a super admin
  if (user.local.user_role !== "super_admin") {
    return res.status(401).json({
      success: false,
      message: "Unauthorised, resource can only accessed by Super Admin",
      error: {
        statusCode: 401,
        message: "Unauthorised, resource can only accessed by Super Admin"
      }
    });
  }

  try {
    let fuser = await User.findOne({ identifier: storeAdminPhoneNumber });
    if (!fuser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }
    fuser.local.is_active = false;
    await fuser.save();
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
    res.status(200).json({
      success: true,
      message: "User Deactivated",
      fuser
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: err
      }
    });
  }
};

exports.activateUser = async (req, res) => {
  const id = req.user.phone_number;
  const storeAdminPhoneNumber = req.params.phone_number;

  const user = await User.findOne({ identifier: id });

  //   check if user exists
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      error: {
        statusCode: 404,
        message: "User not found"
      }
    });
  }

  //   check if user is a super admin
  if (user.local.user_role !== "super_admin") {
    return res.status(401).json({
      success: false,
      message: "Unauthorised, resource can only accessed by Super Admin",
      error: {
        statusCode: 401,
        message: "Unauthorised, resource can only accessed by Super Admin"
      }
    });
  }

  try {
    let fuser = await User.findOne({ identifier: storeAdminPhoneNumber });
    if (!fuser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }
    fuser.local.is_active = true;
    await fuser.save();
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
    res.status(200).json({
      success: true,
      message: "User Activated",
      fuser
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: err
      }
    });
  }
};

// super admin access to view all store admins in the database

exports.getAllStoreAdmin = async (req, res, next) => {
  if (req.user.user_role !== "super_admin") {
    return res.status(401).json({
      success: false,
      message: "Unauthorised, resource can only accessed by Super Admin",
      error: {
        statusCode: 401,
        message: "Unauthorised, resource can only accessed by Super Admin"
      }
    });
  }

  try {
    let storeAdmins = await User.find({});
    res
      .status(200)
      .json({ success: true, message: "All Store Admins", data: storeAdmins });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error
      }
    });
  }
};

exports.getSingleStoreAdmin = async (req, res) => {
  try {
    if (req.user.user_role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "not enough permissions",
        error: {
          statusCode: 403
        }
      });
    }
    const user = await User.findOne({ _id: req.params.id });
    if (!user) {
      return res.status(404).json({
        message: "No store admin with that Id",
        success: false,
        error: {
          statusCode: 404
        }
      });
    }
    const { id } = req.params;
    const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const s_t = month => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      t.setMonth(month, 1);
      const s = new Date();
      s.setMonth(month, 31);
      s.setHours(24, 0, 0, 0);
      return {
        createdAt: {
          $gte: t,
          $lt: s
        }
      };
    };
    const stores = await Store.find({ store_admin_ref: id });
    const trans = (await transactionService.getTransactions({
      store_admin_ref: id
    })).map(elem => ({ storeName: elem.store_name, transaction: { ...elem } }));
    const debts = (await transactionService.getTransactions({
      store_admin_ref: id,
      type: "debt"
    })).map(elem => ({ storeName: elem.store_name, debt: { ...elem } }));
    const data = {
      user,
      storeCount: stores.length,
      assistantCount: await StoreAssistant.countDocuments({
        store_admin_ref: id
      }),
      customerCount: await stores.reduce(
        async (acc, cur) =>
          (await acc) +
          (await customersModel.countDocuments({ store_ref_id: cur._id })),
        0
      ),
      newCustomers: (await stores.reduce(
        async (acc, cur) => [
          ...(await acc),
          ...(await customersModel.find({ store_ref_id: cur._id }))
        ],
        []
      ))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, 15),
      transactions: trans,
      chart: await months.reduce(async (acc, month) => {
        acc = await acc;
        const transactions = await transactionsModel.countDocuments({
          store_admin_ref: id,
          ...s_t(month)
        });
        return [...acc, transactions];
      }, []),
      recentTransactions: trans.slice(0, 15),
      recentDebts: debts.slice(0, 15),
      debtCount: debts.length,
      debtAmount: parseFloat(
        debts.reduce((acc, cur) => {
          if (cur.debt.status == true) {
            return acc;
          }
          return acc + (parseFloat(cur.debt.amount) || 0);
        }, 0)
      ),
      revenueCount: trans.reduce((acc, cur) => {
        if (cur.transaction.status) return acc + 1;
        return acc;
      }, 0),
      revenueAmount: parseFloat(
        trans.reduce((acc, cur) => {
          if (cur.transaction.status)
            return acc + (parseFloat(cur.transaction.amount) || 0);
          return acc;
        }, 0)
      ),
      amountForCurrentMonth: parseFloat(
        trans.reduce((acc, cur) => {
          if (cur.transaction.status == false) return acc;
          let date = new Date();
          let transactionDate = new Date(cur.transaction.createdAt);
          if (
            date.getMonth() == transactionDate.getMonth() &&
            date.getFullYear() == transactionDate.getFullYear()
          ) {
            return acc + (parseFloat(cur.transaction.amount) || 0);
          }
          return acc;
        }, 0)
      ),
      amountForPreviousMonth: trans.reduce((acc, cur) => {
        if (cur.transaction.status == false) return acc;
        let date = new Date();
        let transactionDate = new Date(cur.transaction.createdAt);
        if (
          date.getMonth() - 1 == transactionDate.getMonth() &&
          date.getFullYear() == transactionDate.getFullYear()
        ) {
          return acc + (parseFloat(cur.transaction.amount) || 0);
        }
        return acc;
      }, 0),
      receivablesCount: trans.reduce((acc, cur) => {
        if (
          (cur.transaction.type && cur.transaction.type.toLowerCase()) !==
          "receivables"
        )
          return acc;
        return acc + 1;
      }, 0),
      receivablesAmount: parseFloat(
        trans.reduce((acc, cur) => {
          if (
            (cur.transaction.type && cur.transaction.type.toLowerCase()) !==
            "receivables"
          )
            return acc;
          return acc + parseFloat(cur.transaction.amount) || 0;
        }, 0)
      )
    };
    return res.status(200).json({
      success: true,
      message: "admin dashboard",
      data
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
