const Transaction = require("../models/transaction");
const Debts = require("../models/debt_reminders");

module.exports = {
  getDebts: (params) => {
    return Debts.find(params);
  },
  getTransactions: async (params) => {
    let transactions = await Transaction.find(params)
      .populate({ path: "store_ref_id customer_ref_id" })
      .exec();
    transactions = await Promise.all(
      transactions.map(async (transaction) => {
        transaction = transaction.toObject();
        const debts = await module.exports.getDebts({
          trans_ref_id: transaction._id,
        });
        const { store_name, _id: store_id } = transaction.store_ref_id || {};
        const { _id } = transaction.customer_ref_id;
        return {
          ...transaction,
          store_name,
          store_id,
          store_ref: transaction.store_ref_id,
          store_ref_id: store_id,
          customer_ref_id: _id,
          customer_ref: transaction.customer_ref_id,
          debts,
        };
      })
    );
    return transactions;
  },
};
