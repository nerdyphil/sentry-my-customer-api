const Transaction = require("../models/transaction");
const Debts = require("../models/debt_reminders");

module.exports = {
  getDebts: (params) => {
    return Debts.find(params);
  },
  getTransactions: async (params) => {
    let transactions = await Transaction.find(params);
    transactions = await Promise.all(
      transactions.map(async (transaction) => {
        transaction = transaction.toObject();
        const debts = await module.exports.getDebts({
          trans_ref_id: transaction._id,
        });
        return { ...transaction, debts };
      })
    );
    return transactions;
  },
};
