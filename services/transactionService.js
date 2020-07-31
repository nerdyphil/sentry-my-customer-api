const Transaction = require("../models/transaction");
const Debts = require("../models/debt_reminders");
const _ = require("lodash");

module.exports = {
  getDebts: (params) => {
    return Debts.find(params);
  },
  getTransactions: async (params, limit) => {
    let transactions;
    if (limit) {
      transactions = await Transaction.find(params)
        .populate({ path: "store_ref_id customer_ref_id store_admin_ref" })
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();
    } else {
      transactions = await Transaction.find(params)
        .populate({ path: "store_ref_id customer_ref_id store_admin_ref" })
        .sort({ createdAt: -1 })
        .exec();
    }
    transactions = await transactions.reduce(async (acc, transaction) => {
      acc = await acc;
      transaction = transaction.toObject();
      if (
        !transaction.store_ref_id ||
        !transaction.customer_ref_id ||
        !transaction.store_admin_ref
      )
        return acc;
      const debts = await module.exports.getDebts({
        trans_ref_id: transaction._id,
      });
      const {
        store_name = "not_set",
        _id: store_id = transaction.store_ref_id,
      } = transaction.store_ref_id || {};
      const { _id = transaction.customer_ref_id } =
        transaction.customer_ref_id || {};
      return [
        ...acc,
        {
          ...transaction,
          store_admin_ref: {
            currencyPreference: "ngn",
            ...transaction.store_admin_ref,
          },
          store_name,
          storeName: store_name,
          store_id,
          store_ref: transaction.store_ref_id,
          store_ref_id: store_id,
          customer_ref_id: _id,
          customer_ref: transaction.customer_ref_id,
          debts,
        },
      ];
    }, []);
    return transactions;
  },
  getOneTransaction: async (params) => {
    const s = await Transaction.findOne(params)
      .populate({ path: "store_ref_id customer_ref_id store_admin_ref" })
      .exec();
    if (!s) return s;
    const transaction = s.toObject();
    if (
      !transaction.store_ref_id ||
      !transaction.customer_ref_id ||
      !transaction.store_admin_ref
    )
      return null;
    const debts = await module.exports.getDebts({
      trans_ref_id: transaction._id,
    });
    const { store_name, _id: store_id } = transaction.store_ref_id;
    const { _id } = transaction.customer_ref_id;
    return {
      ...transaction,
      store_admin_ref: {
        currencyPreference: "ngn",
        ...transaction.store_admin_ref,
      },
      store_name,
      store_id,
      store_ref: transaction.store_ref_id,
      store_ref_id: store_id,
      customer_ref_id: _id,
      customer_ref: transaction.customer_ref_id,
      debts,
    };
  },
  deleteOneTransaction: async (params) => {
    const s = await Transaction.findOne(params);
    await Debts.deleteMany({
      trans_ref_id: s._id,
    });
    if (!s) return s;
    await s.remove();
    return true;
  },
  updateOneTransaction: async (params, update) => {
    let transaction = await Transaction.findOne(params);
    if (!transaction) return transaction;
    _.merge(transaction, update);
    await transaction.save();
    return module.exports.getOneTransaction({ _id: transaction._id });
  },
};
