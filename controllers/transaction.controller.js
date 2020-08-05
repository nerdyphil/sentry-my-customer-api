const Transaction = require("../models/transaction");
const DebtReminders = require("../models/debt_reminders");
const UserModel = require("../models/store_admin");
const StoreModel = require("../models/store");
const Customer = require("../models/customer");
const { body } = require("express-validator/check");
const { errorHandler } = require("./login_controler");
const { transactionService } = require("../services");
const onFinished = require("on-finished");
const Activity = require("../models/activity");

exports.validate = method => {
  switch (method) {
    case "create": {
      return [
        body("store_id").isString(),
        body("customer_id").isString(),
        body("amount").isNumeric(),
        body("interest")
          .optional()
          .isNumeric(),
        body("total_amount")
          .optional()
          .isNumeric(),
        body("description")
          .optional()
          .isString(),
        body("type").isString(),
        body("status")
          .optional()
          .isBoolean(),
        body("expected_pay_date")
          .optional()
          .isISO8601()
      ];
    }
    case "update": {
      return [
        body("store_id").isString(),
        body("customer_id").isString(),
        body("amount")
          .optional()
          .isNumeric(),
        body("interest")
          .optional()
          .isNumeric(),
        body("total_amount")
          .optional()
          .isNumeric(),
        body("description")
          .optional()
          .isString(),
        body("type")
          .optional()
          .isString(),
        body("status")
          .optional()
          .isBoolean(),
        body("expected_pay_date")
          .optional()
          .isISO8601()
      ];
    }
  }
};

// Create and Save a new Transaction
exports.create = async (req, res) => {
  try {
    let store = await StoreModel.findOne({
      _id: req.body.store_id,
      store_admin_ref: req.user.store_admin_ref
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        data: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }
    let customer = await Customer.findOne({
      _id: req.body.customer_id,
      store_ref_id: store._id
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        data: {
          statusCode: 404,
          message: "Customer not found"
        }
      });
    }
    const trans = await Transaction.create({
      store_ref_id: req.body.store_id,
      customer_ref_id: req.body.customer_id,
      store_admin_ref: store.store_admin_ref,
      amount: req.body.amount,
      interest: req.body.interest || null,
      total_amount: req.body.total_amount || null,
      ass_ref_id: store.assistant,
      assistant_inCharge: store.assistant,
      description: req.body.description || "Not set",
      type: req.body.type,
      status: req.body.status || false,
      expected_pay_date: req.body.expected_pay_date || null
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
    return res.status(200).json({
      success: true,
      message: "Transaction saved",
      data: {
        transaction: trans
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Retrieve and return all transactions from the database.
exports.findAll = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const user = await UserModel.findOne({
      $or: [
        {
          identifier: req.user.phone_number,
          "local.user_role": req.user.user_role
        },
        {
          "assistants.phone_number": req.user.phone_number,
          "assistants.user_role": req.user.user_role
        }
      ]
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }

    const store = user.stores.find(store => store._id == req.params.store_id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        data: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }

    const customer = store.customers.find(
      customer => customer._id == req.params.customer_id
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        data: {
          statusCode: 404,
          message: "Customer not found"
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Transactions",
      data: {
        transactions: customer.transactions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      data: {
        statusCode: 500,
        message: error
      }
    });
  }
};

exports.findAllStore = async (req, res) => {
  try {
    let transactions;
    if (req.user.user_role === "super_admin") {
      transactions = await transactionService.getTransactions({});
    } else {
      transactions = await transactionService.getTransactions({
        $or: [
          { store_ref_id: req.user.store_id },
          { store_admin_ref: req.user._id }
        ]
      });
    }
    return res.status(200).json({
      success: true,
      message: "Transactions",
      data: {
        statusCode: 200,
        transactions
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.findAllAdmin = async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.user._id });
    if (!user || user.local.user_role !== "super_admin") {
      return res.status(401).json({
        success: false,
        message: "not enough permissions",
        data: {
          statusCode: 401
        }
      });
    }
    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .populate({ path: "store_ref_id" })
      .populate({ path: "customer_ref_id" })
      .populate({ path: "store_admin_ref" });

    res.status(200).json({
      success: true,
      message: "Transactions",
      data: {
        transactions
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Find a single transaction with a transaction_id
exports.findOne = async (req, res, next) => {
  try {
    let transaction;
    if ((req.user.user_role = "super_admin")) {
      transaction = await transactionService.getOneTransaction({
        _id: req.params.transaction_id
      });
    } else {
      transaction = await transactionService.getOneTransaction({
        _id: req.params.transaction_id,
        store_admin_ref: req.user.store_admin_ref
      });
    }
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
          message: "Transaction not found"
        }
      });
    }
    return res.status(200).json({
      success: true,
      message: "Transaction",
      data: {
        transaction
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.findOneTransaction = async (req, res, next) => {
  try {
    let transaction;
    transaction = await transactionService.getOneTransaction({
      _id: req.params.transaction_id
    });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
          message: "Transaction not found"
        }
      });
    }
    return res.status(200).json({
      success: true,
      message: "Transaction",
      data: {
        transaction
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Update a transaction identified by the transaction_id in the request
exports.update = async (req, res) => {
  try {
    const transaction = await transactionService.updateOneTransaction(
      {
        _id: req.params.transaction_id
      },
      req.body
    );
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction updated",
        error: {
          statusCode: 404
        }
      });
    }
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
      message: "Transaction updated",
      data: {
        transaction
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Delete a transaction with the specified transaction_id in the request
exports.delete = async (req, res) => {
  try {
    const transaction = await transactionService.deleteOneTransaction({
      _id: req.params.transaction_id
    });
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "could not find transaction",
        error: {
          statusCode: 404
        }
      });
    }
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
      message: "Deleted",
      data: {
        transaction: null
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
