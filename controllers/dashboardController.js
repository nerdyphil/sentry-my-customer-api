const Debts = require("../models/debt_reminders");
const storeAdminModel = require("../models/store_admin");
const storeAssistantModel = require("../models/storeAssistant");
const Stores = require("../models/store");
const customerModel = require("../models/customer");
const transactionModel = require("../models/transaction");
const complaintsModel = require("../models/complaint_form");
const { errorHandler } = require("./login_controler");
const { getSingleStoreAdmin } = require("./user.controller");
const { transactionService } = require("../services");

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
  },
};
exports.storeAdminDashboard = (req, res) => {
  req.user.user_role = "super_admin";
  req.params.id = req.user._id;
  return getSingleStoreAdmin(req, res);
};

exports.superAdminDashboard = async (req, res) => {
  if (req.user.user_role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "You do not have enough permission",
      error: {
        statusCode: 403,
      },
    });
  }
  try {
    const storeAdminCount = await storeAdminModel.countDocuments({
      "local.user_role": { $ne: "super_admin" },
    });
    const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const s_t = (month) => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      t.setMonth(month, 1);
      const s = new Date();
      s.setMonth(month, 31);
      s.setHours(24, 0, 0, 0);
      return {
        createdAt: {
          $gte: t,
          $lt: s,
        },
      };
    };
    const assistantsCount = await storeAssistantModel.countDocuments({});
    const totalDebt = (
      await transactionService.getTransactions({ type: "debt" })
    ).reduce(
      (acc, cur) => acc + (parseFloat(cur.amount || cur.total_amount) || 0),
      0
    );
    const customerCount = await customerModel.countDocuments({});
    const storesCount = await Stores.countDocuments({});
    const transactionCount = await transactionModel.countDocuments({});
    const complaintCount = await complaintsModel.countDocuments({});
    const graphData = {
      incomePerMonth: await months.reduce(async (acc, month) => {
        acc = await acc;
        const { createdAt } = s_t(month);
        const transactions = await transactionModel.find({
          status: {
            $ne: false,
          },
          createdAt,
        });
        return [
          ...acc,
          transactions.reduce(
            (acc, cur) =>
              acc + (parseFloat(cur.amount || cur.total_amount) || 0),
            0
          ),
        ];
      }, []),
      transactionsPerMonth: await months.reduce(async (acc, month) => {
        acc = await acc;
        const transactions = await transactionModel.countDocuments(s_t(month));
        return [...acc, transactions];
      }, []),
      usersPerMonth: await months.reduce(async (acc, month) => {
        acc = await acc;
        const customers = await customerModel.countDocuments(s_t(month));
        const admins = await storeAdminModel.countDocuments({
          "local.user_role": { $ne: "super_admin" },
          ...s_t(month),
        });
        const assistants = await storeAssistantModel.countDocuments(s_t(month));
        return [...acc, customers + admins + assistants];
      }, []),
    };
    const recentTransaction = await transactionService.getTransactions({}, 20);
    const latestDebt = await transactionService.getTransactions(
      { type: "debt" },
      20
    );

    const data = {
      usersCount: storeAdminCount + assistantsCount + customerCount,
      storesCount,
      totalDebt,
      storeAdminCount,
      assistantsCount,
      customerCount,
      transactionCount,
      complaintCount,
      ...graphData,
      recentTransaction,
      latestDebt,
    };
    return res.status(200).json({
      success: true,
      message: "your dashboard data",
      data,
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.storeAssistantDashboard = async (req, res) => {
  const data = {};
  try {
    const store_assistant = await storeAssistantModel
      .findOne({
        _id: req.user._id,
      })
      .select("-password")
      .exec();
    if (!store_assistant) {
      return res.status(404).json({
        success: false,
        message: "cannot find assistant",
        error: {
          statusCode: 404,
        },
      });
    }
    data.user = store_assistant;
    const assistantStore_id = store_assistant.store_id;
    const assistantStore = await Stores.findOne({ _id: assistantStore_id });
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
    const assistantstore_customers = await customerModel.find({
      store_ref_id: assistantStore_id,
    });
    assistantstore_customers.forEach(async (customer) => {
      data.customerCount += 1;
      customerTransactions = await transactionModel
        .find({
          customer_ref_id: customer._id,
        })
        .populate({ path: "store_ref_id" })
        .exec();
      customerTransactions.forEach((transaction) => {
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
      message: "Assistant dashboard data.",
      data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
      error: {
        statusCode: 500,
        message: error.message,
      },
    });
  }
};

exports.customerDashboard = async (req, res) => {
  const phone_number = req.user.phone_number;
  const data = {};
  try {
    const customer = await customerModel.findOne({
      phone_number: phone_number,
    });
    if (!customer) {
      res.status(404).send({
        success: false,
        message: "Customer does not exist",
        error: {
          statusCode: 400,
          message: "Customer does not exist",
        },
      });
    }

    const store = await Stores.findOne({ _id: customer.store_ref_id });

    if (!store) {
      res.status(404).send({
        success: false,
        message: "Customer does not belong to a store",
        error: {
          statusCode: 400,
          message: "Customer does not belong to a store",
        },
      });
    }

    const transactions = await transactionModel.find({
      customer_ref_id: customer._id,
    });
    //sort customer transactions and debts by date
    transactions.sort(compareTransactions);
    if (transactions.debts) {
      transactions.debts.sort(compareTransactions);
    }
    data.customer = customer;
    data.store = store;
    data.transactions = transactions;
    res.status(200).send({
      success: true,
      message: "Customer dashboard data",
      data: data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error.message,
      },
    });
  }
};
