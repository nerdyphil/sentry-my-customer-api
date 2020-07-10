const Transaction = require("../models/transaction");
const UserModel = require("../models/store_admin");
const StoreModel = require("../models/store");

// Create and Save a new Transaction
exports.create = (req, res, next) => {
  let {
    amount,
    interest,
    total_amount,
    description,
    phone_number,
    store_name,
    type,
    transaction_name,
    transaction_role,
  } = req.body;

  let req_keys = {
    amount,
    interest,
    total_amount,
    description,
    type,
    store_name,
    transaction_name,
    transaction_role,
  };

  const identifier = req.user.phone_number;
  let store_ref_id;
  let customer_ref_id;

  UserModel.findOne({ identifier })
    .then((user) => {
      let stores = user.stores;
      stores.forEach((store) => {
        if (store.store_name == store_name) {
          store_ref_id = store._id;
          var customers = store.customers;
          if (customers.length > 0) {
            customers.forEach((customer) => {
              if (customer.phone_number == phone_number) {
                customer_ref_id = customer._id;

                req_keys.customer_ref_id = customer_ref_id;
                req_keys.store_ref_id = store_ref_id;
                req_keys.debts = [];
                req_keys.store_name = store_name;

                customer.transactions.push(req_keys);
              }
            });
          }
        }
      });
      if (customer_ref_id == undefined || store_ref_id == undefined) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone_number and/or store_name",
          error: {
            statusCode: 400,
            message: "Invalid phone_number and/or store_name",
          },
        });
      }
      user
        .save()
        .then((result) => {
          return res.status(201).json({
            success: true,
            message: "Transaction created",
            data: {
              details: req_keys,
            },
          });
        })
        .catch((err) => {
          return res.status(500).json({
            success: false,
            message: "Error saving to database",
            error: {
              statusCode: 500,
              message: err,
            },
          });
        });
    })
    .catch((err) => {
      return res.status(500).json({
        status: false,
        message: "Something went wrong",
        error: {
          code: 500,
          message: err,
        },
      });
    });
};

// Retrieve and return all transactions from the database.
exports.findAll = async (req, res, next) => {
  const identifier = req.user.phone_number;
  UserModel.findOne({ identifier })
    .then((user) => {
      let stores = user.stores;
      let details = [];

      stores.forEach((store) => {
        let customers = store.customers;
        customers.forEach((customer) => {
          let obj = {};
          obj.storeName = store.store_name;
          obj.customerName = customer.name;
          obj.transactions = customer.transactions;

          details.push(obj);
        });
      });

      if (details.length == 0) {
        res.status(200).json({
          success: true,
          message: "No transaction associated with this user account",
          data: {
            transactions: details,
          },
        });
      } else {
        return res.status(200).json({
          success: true,
          message: "Here is a list of your transactions",
          data: {
            details,
          },
        });
      }
    })
    .catch((err) => {
      return res.status(500).json({
        success: false,
        message: "Error fetching transactions",
        error: {
          code: 500,
          message: err,
        },
      });
    });
};

// Find a single transaction with a transaction_id
exports.findOne = (req, res, next) => {
  const identifier = req.user.phone_number;
  let details = [];
  UserModel.findOne({ identifier })
    .then((user) => {
      let stores = user.stores;
      stores.forEach((store) => {
        let customers = store.customers;
        customers.forEach((customer) => {
          let transactions = customer.transactions;
          transactions.forEach((transaction) => {
            if (transaction._id == req.params.transaction_id) {
              details.push(transaction);

              return res.status(200).json({
                success: true,
                Message: "Operation successful",
                data: {
                  storeName: store.store_name,
                  transaction,
                },
              });
            }
          });
        });
      });
      if (details.length == 0) {
        res.status(404).json({
          success: false,
          Message: "Transaction not Found",
          error: {
            statusCode: 404,
            message: "Transaction not Found",
          },
        });
      }
    })
    .catch((err) => {
      res.status(500).json({
        success: false,
        Message: "Error retriving transaction from database",
        error: {
          statusCode: 500,
          message: err,
        },
      });
    });
};

// Update a transaction identified by the transaction_id in the request
exports.update = async (req, res, next) => {
  const identifier = req.user.phone_number;
  const id = req.params.transaction_id;
  const {
    store_name,
    description,
    amount,
    interest,
    total_amount,
    transaction_name,
    transaction_role,
    type,
  } = req.body;

  try {
    UserModel.findOne({ identifier })
      .then((user) => {
        let store = user.stores.find((store) => store.store_name == store_name); //find store
        let allTransactions = []; // all transactions would be pushed here

        store.customers.forEach((customer) => {
          // loop over customers
          customer.transactions.forEach((trans) => {
            //loop over transactions
            allTransactions.push(trans); //push all transactions to allTransactions
          });
        });

        let transToUpdate = allTransactions.find((trans) => trans._id == id); // find transaction required

        let update = {
          amount: amount || transToUpdate.amount,
          description: description || transToUpdate.description,
          interest: interest || transToUpdate.interest,
          total_amount: total_amount || transToUpdate.total_amount,
          transaction_role: transaction_role || transToUpdate.transaction_role,
          transaction_name: transaction_name || transToUpdate.transaction_name,
          type: type || transToUpdate.type,
        }; // update with field from req.body or if null still use the value already in db

        transToUpdate = Object.assign(transToUpdate, update); // merge update

        user
          .save()
          .then((result) => {
            res.status(200).json({
              success: true,
              message: "Transaction updated successfully",
              data: {
                statusCode: 200,
                transaction: transToUpdate,
              },
            });
          })
          .catch((err) => {
            res.status(500).json({
              sucess: false,
              message: "Couldn't update transaction",
              error: {
                statusCode: 500,
                message: "Couldn't update transaction",
              },
            });
          });
      })
      .catch((err) => {
        res.status(404).json({
          sucess: false,
          message: "User not found",
          error: {
            statusCode: 404,
            message: "User not found",
          },
        });
      });
  } catch (error) {
    res.status(500).json({
      sucess: false,
      message: "Couldn't update transaction",
      error: {
        statusCode: 500,
        message: "Couldn't update transaction",
      },
    });
  }
};

// Delete a transaction with the specified transaction_id in the request
exports.delete = (req, res) => {
  const identifier = req.user.phone_number;
  let found = false;
  UserModel.findOne({ identifier })
    .then((user) => {
      let stores = user.stores;
      stores.forEach((store) => {
        let customers = store.customers;
        if (customers.length > 0) {
          customers.forEach((customer) => {
            let transactions = customer.transactions;
            transactions.forEach((transaction, index) => {
              if (transaction._id == req.params.transaction_id) {
                found = true;
                transactions.splice(index, 1);
              }
            });
          });
        }
      });
      if (found == false) {
        return res.status(404).json({
          status: false,
          message: "transaction not found",
          error: {
            code: 404,
            message: "transaction not found",
          },
        });
      }
      user
        .save()
        .then((result) => {
          res.status(200).json({
            success: true,
            message: "transaction deleted successful",
            data: {
              statusCode: 200,
            },
          });
        })
        .catch((err) => {
          return res.status(500).json({
            success: false,
            message: "Error deleting transaction",
            data: {
              statusCode: 500,
              err,
            },
          });
        });
    })
    .catch((err) => {
      return res.status(500).json({
        status: false,
        message: "Something went wrong",
        error: {
          code: 404,
          message: err,
        },
      });
    });
};
