const Customer = require("../models/customer");

const transactionService = require("./transactionService");

module.exports = {
  getCustomers: async (params) => {
    let customers = await Customer.find(params)
      .populate({ path: "store_ref_id" })
      .exec();
    customers = await Promise.all(
      customers.map(async (customer) => {
        customer = customer.toObject();
        let transactions = await transactionService.getTransactions({
          customer_ref_id: customer._id,
        });
        const { store_name = "not_set", _id = customer.store_ref_id } =
          customer.store_ref_id || {};
        return {
          ...customer,
          store_name,
          storeName: store_name,
          store_id: _id,
          store_ref_id: _id,
          transactions,
        };
      })
    );
    return customers;
  },
  getOneCustomer: async (params) => {
    let customer = await Customer.findOne(params)
      .populate({ path: "store_ref_id" , populate: { path:"store_admin_ref" }})
      .exec();
    if (!customer) return customer;
    const { store_name = "not_set", _id = customer.store_ref_id } =
      customer.store_ref_id || {};
    return {
      ...customer.toObject(),
      store_name,
      storeName: store_name,
      store_id: _id,
      store_ref_id: _id,
      currency: customer.store_ref_id.store_admin_ref.currencyPreference,
      transactions: await transactionService.getTransactions({
        customer_ref_id: customer._id,
      }),
    };
  },
};
