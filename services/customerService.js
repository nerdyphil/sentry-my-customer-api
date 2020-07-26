const Customer = require("../models/customer");

const transactionService = require("./transactionService");

module.exports = {
  getCustomers: async (params) => {
    let customers = await Customer.find(params);
    customers = await Promise.all(
      customers.map(async (customer) => {
        customer = customer.toObject();
        let transactions = await transactionService.getTransactions({
          customer_ref_id: customer._id,
        });
        return { ...customer, transactions };
      })
    );
    return customers;
  },
  getOneCustomer: async (params) => {
    let customer = await Customer.findOne(params);
    if (!customer) return customer;
    return {
      ...customer.toObject(),
      transactions: await transactionService.getTransactions({
        customer_ref_id: customer._id,
      }),
    };
  },
};
