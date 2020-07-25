const userModel = require("../models/user");
const storeAdminModel = require("../models/store_admin");
const storeAssistantModel = require("../models/storeAssistant");
const storeModel = require("../models/store");
const customerModel = require("../models/customer");
const util = require("../util/sort_data");

exports.storeAdminDashboard = async (req, res, next) => {
  const identifier = req.user.phone_number;
  const role = req.user.user_role;

  if (role != "store_admin") {
    // if (role == "store_assistant") {
    //   var u = 1;
    // } else {
    //   return next();
    // }
    res.status(401).send({
      success: false,
      message: 'User not authorized to access store admin dashboard',
      error:{
        statusCode: 401,
        message: 'User not authorized to access store admin dashboard'
      }
    })
  }

  const storeAdmin = await storeAdminModel.findOne({ identifier
    // $or: [
    //   { identifier: req.user.phone_number, "local.user_role": req.user.user_role },
    //   {
    //     "assistants.phone_number": req.user.phone_number,
    //     "assistants.user_role": req.user.user_role
    //   }
    // ]
  });
  if (!storeAdmin) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      error: {
        statusCode: 404,
        message: "User not found"
      }
    });
  }

  try {
    const data = {};
    const stores = storeAdmin.stores;
    const assistants = storeAdmin.assistants;
    //get number of stores
    data.storeCount = stores.length;
    //get number of assisstants
    data.assistantCount = assistants.length;
    //initialize customer count, new customers and transactions
    data.customerCount = 0;
    data.newCustomers = [];
    data.transactions = [];
    data.recentTransactions = [];
    data.recentDebts = [];
    data.chart = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    data.debtCount = 0;
    data.debtAmount = 0;
    data.revenueCount = 0;
    data.revenueAmount = 0;
    data.receivablesCount = 0;
    data.receivablesAmount = 0;
    data.amountForCurrentMonth = 0;
    data.amountForPreviousMonth = 0;
    data.count = 0

    stores.forEach(store => {
      //increment customer count by number of customers in each store
      data.customerCount = data.customerCount + store.customers.length;

      const customers = store.customers;
      let date = new Date();
      //filter customers array to get all new customers
      const newCustomers = customers.filter(element => {
        return element.createdAt.toDateString() == date.toDateString();
      });
      if (newCustomers.length > 0) {
        //push in new customer details into new customers array
        newCustomers.forEach(element =>
          data.newCustomers.push({
            name: element.name,
            phone_number: element.phone_number,
            email: element.email
          })
        );
      }

      customers.forEach(customer => {
        //push in transaction details for each customer
        if (customer.transactions.length != 0) {
          let obj = {};
          obj.storeName = store.store_name;
          obj.customerName = customer.name;
          //sort transactions by date
          obj.transactions = customer.transactions.sort(util.compareTransactions);
          data.transactions.push(obj);
          

          const transactions = customer.transactions;
          transactions.forEach(transaction => {
            //push in details of each transaction
            let obj = {};
            obj.storeName = store.store_name;
            obj.customerName = customer.name;
            obj.transaction = transaction;
            data.recentTransactions.push(obj);

            data.chart = util.getTransactionForMonth(obj, data.chart);

            if (transaction.type.toLowerCase() == "debt" && transaction.status == false) {
              //increment debt count
              data.debtCount += 1;
              //increment debt amount
              try {
                data.debtAmount += parseFloat(transaction.amount);
              } catch (error) {
                data.debtAmount += 0;
              }
              //push in details of each debt
              let obj = {};
              obj.storeName = store.store_name;
              obj.customerName = customer.name;
              obj.debt = transaction;
              data.recentDebts.push(obj);
            }

            if (transaction.type.toLowerCase() == "debt" && transaction.status == true) {
              data.revenueCount += 1;
              let transactionDate = new Date(transaction.createdAt)
              //get revenue for current month
              if (date.getMonth() == transactionDate.getMonth() && 
                date.getFullYear() == transactionDate.getFullYear()
              ) 
              {
                try {
                  data.amountForCurrentMonth += parseFloat(transaction.amount)
                } catch (error) {
                  data.amountForCurrentMonth += 0
                }
              }

              //get revenue for previous month
              if (date.getMonth()-1 == transactionDate.getMonth() && 
                date.getFullYear() == transactionDate.getFullYear()
              ) {
                try {
                  data.amountForPreviousMonth += parseFloat(transaction.amount)
                } catch (error) {
                  data.amountForPreviousMonth += 0
                }
              }

              //increment revenue amount
              try {
                data.revenueAmount += parseFloat(transaction.amount);
              } catch (error) {
                data.revenueAmount += 0;
              } 
            }

            if (transaction.type.toLowerCase() == "paid") {
              data.revenueCount += 1;
              let transactionDate = new Date(transaction.createdAt);
              //get revenue for current month
              if (date.getMonth() == transactionDate.getMonth() ) {
                try {
                  data.amountForCurrentMonth += parseFloat(transaction.amount)
                } catch (error) {
                  data.amountForCurrentMonth += 0
                }
              }

              //get revenue for previous month
              if (date.getMonth()-1 == transactionDate.getMonth() ) {
                try {
                  data.amountForPreviousMonth += parseFloat(transaction.amount)
                } catch (error) {
                  data.amountForPreviousMonth += 0
                }
              }

              try {
                data.revenueAmount += parseFloat(transaction.amount);
              } catch (error) {
                data.revenueAmount += 0;
              }
            }

            if (transaction.type.toLowerCase() == "receivables") {
              data.receivablesCount += 1;
              try {
                data.receivablesAmount  += parseFloat(transaction.amount);
              } catch (error) {
                data.receivablesAmount += 0;
              }
            }

          });
        }
      });
    });

    // sort transactions and debts by date in descending order
    data.transactions.sort(util.compareCustomers);
    data.recentTransactions = data.recentTransactions.sort(util.compareRecentTransactions).slice(0,15);
    data.recentDebts= data.recentDebts.sort(util.compareRecentDebts).slice(0,15);

    return res.status(200).json({
      success: true,
      message: "Store Admin dashboard data",
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error.message
      }
    });
  }
};

exports.superAdminDashboard = async (req, res) => {
  const id = req.user.phone_number;

  const User = await storeAdminModel.findOne({ identifier: id });

  //   check if user exists
  if (!User) {
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
  if (User.local.user_role !== "super_admin") {
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
    let users = await storeAdminModel.find({});

    let data = {};
    data.storeAdminCount = users.length;
    data.storesCount = 0;
    data.assistantsCount = 0;
    data.customerCount = 0;

    data.usersCount = 0;

    users.forEach(user => {
      let stores = user.stores;
      data.storesCount += stores.length;
      data.assistantsCount += user.assistants.length;
      stores.forEach(store => {
        let customers = store.customers;
        data.customerCount += customers.length;
      });
    });

    // the total number of users should be = storeAdmin + customers + storeAssistants
    data.usersCount =
      data.storeAdminCount + data.customerCount + data.assistantsCount;
    res.status(200).json({
      success: true,
      message: "Dashboard data",
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error.message
      }
    });
  }
};

exports.storeAssistantDashboard = async (req, res) => {
  const phone_number = req.user.phone_number;
  const data ={};
  
  var storeAdmin = await storeAdminModel.aggregate([
    {$unwind: "$assistants"},
    {$match: { "assistants.phone_number": phone_number }}
  ]);

  
  if (storeAdmin.length == 0) {
    return res.status(404).json({
      success: false,
      message: "Store Admin not found",
      error: {
        statusCode: 404,
        message: "Store Admin not found"
      }
    });
  }
  try {
    storeAdmin = storeAdmin[0];
    const assistant = storeAdmin.assistants;
    data.user = assistant;
    
    const store_id = assistant.store_id;
    if (!store_id) {
      return res.status(404).json({
        success: false,
        message: 'Assistant does not belong to a store',
        error:{
          statusCode: '',
          message: 'Assistant does not belong to a store'
        }
      })
    }
    const assistantStore = storeAdmin.stores.find(store => store._id == store_id);
    data.storeName = assistantStore.store_name;
    data.storeAddress = assistantStore.shop_address
    data.customerCount = 0; 
    data.transactionCount = 0;
    data.recentTransactions =[];
    data.chart = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    data.debtCount = 0;
    data.debtAmount = 0;
    data.revenueCount = 0;
    data.revenueAmount = 0;
    data.receivablesCount = 0;
    data.receivablesAmount = 0;
    data.amountForCurrentMonth = 0;
    data.amountForPreviousMonth = 0;
    assistantStore.customers.forEach(customer => {
      data.customerCount += 1;
      customer.transactions.forEach(transaction => {
        if (transaction.assistant_inCharge == assistant._id) {
          data.transactionCount += 1;

          let obj = {};
          obj.customerName = customer.name;
          obj.storeName = assistantStore.store_name;
          obj.transaction = transaction;
          data.recentTransactions.push(obj);

          data.chart = util.getTransactionForMonth(obj, data.chart);

          if (transaction.type.toLowerCase() == 'debt' && transaction.status == false) {
            data.debtCount += 1;
            try { data.debtAmount += parseFloat(transaction.amount); 
            } catch (error) {
              data.debtAmount += 0
            }
          }

          if (transaction.type.toLowerCase() == 'debt' &&  transaction.status == true) {
            data.revenueCount += 1;
            try { data.revenueAmount += parseFloat(transaction.amount); 
            } catch (error) {
              data.revenueAmount += 0
            }

            let date = new Date();
            let transactionDate = new Date(transaction.createdAt)
            //get revenue for current month
            if (date.getMonth() == transactionDate.getMonth() && 
              date.getFullYear() == transactionDate.getFullYear()
            ) 
            {
              try {
                data.amountForCurrentMonth += parseFloat(transaction.amount)
              } catch (error) {
                data.amountForCurrentMonth += 0
              }
            }

            //get revenue for previous month
            if (date.getMonth()-1 == transactionDate.getMonth() && 
              date.getFullYear() == transactionDate.getFullYear()
            ) {
              try {
                data.amountForPreviousMonth += parseFloat(transaction.amount)
              } catch (error) {
                data.amountForPreviousMonth += 0
              }
            }
          }

          if (transaction.type.toLowerCase() == 'paid') {
            data.revenueCount += 1;
            try { data.revenueAmount += parseFloat(transaction.amount); 
            } catch (error) {
              data.revenueAmount += 0
            }

            let date = new Date();
            let transactionDate = new Date(transaction.createdAt)
            //get revenue for current month
            if (date.getMonth() == transactionDate.getMonth() && 
              date.getFullYear() == transactionDate.getFullYear()
            ) 
            {
              try {
                data.amountForCurrentMonth += parseFloat(transaction.amount)
              } catch (error) {
                data.amountForCurrentMonth += 0
              }
            }

            //get revenue for previous month
            if (date.getMonth()-1 == transactionDate.getMonth() && 
              date.getFullYear() == transactionDate.getFullYear()
            ) {
              try {
                data.amountForPreviousMonth += parseFloat(transaction.amount)
              } catch (error) {
                data.amountForPreviousMonth += 0
              }
            }
          }

          if (transaction.type.toLowerCase() == 'receivables') {
            data.receivablesCount += 1;
            try { data.receivablesAmount +=  parseFloat(transaction.amount); 
            } catch (error) {
              data.receivablesAmount += 0
            }
          }
        }
      })
    })
    //sort transactions by time
    data.recentTransactions = data.recentTransactions.sort(util.compareRecentTransactions).slice(0,15)

    return res.status(200).json({
      success: true,
      message: "Store Assistant dashboard data",
      data: data
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
      error:{
        statusCode: 500,
        message: error.message
      }
    })
  }
  
};

exports.customerDashboard = async (req, res) => {
  const phone_number = req.user.phone_number;
  const data = [];
  try {
    const storeAdmin = await storeAdminModel.aggregate([
      { $unwind: "$stores" },
      { $unwind: "$stores.customers" },
      { $match: { "stores.customers.phone_number": phone_number } }
    ]);

    if (storeAdmin.length == 0) {
      res.status(404).send({
        success: false,
        message: "Customer store has no admin",
        error: {
          statusCode: 400,
          message: "Customer store has no admin"
        }
      });
    }

    const store = storeAdmin[0].stores;
    if (!store) {
      res.status(404).send({
        success: false,
        message: "Customer does not belong to a store",
        error: {
          statusCode: 400,
          message: "Customer does not belong to a store"
        }
      });
    }

    if (storeAdmin.length == 1) {
      const customer = store.customers;
      //sort customer transactions and debts by date
      customer.transactions.sort(compareTransactions);
      if (customer.transactions.debts) {
        customer.transactions.debts.sort(compareTransactions);
      }
      res.status(200).send({
        success: true,
        message: "Customer dashboard data",
        data: storeAdmin
      });
    }

    storeAdmin.forEach(admin => {
      const store = admin.stores;
      const customer = store.customers;
      //sort customer transactions and debts by date
      customer.transactions.sort(compareTransactions);
      if (customer.transactions.debts) {
        customer.transactions.debts.sort(compareTransactions);
      }
      data.push(admin);
    });

    res.status(200).send({
      success: true,
      message: "Customer dashboard data",
      data: storeAdmin
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error.message
      }
    });
  }
};

// //utility functions
// function compareTransactions(a, b) {
//   //compares two time stamps and places the earlier timestamp before the other
//   if (a.createdAt.getTime() > b.createdAt.getTime()) return -1;
//   if (b.createdAt.getTime() < a.createdAt.getTime()) return 1;

//   return 0;
// }

// function compareCustomers(a, b) {
//   //compares two time stamps and places the earlier timestamp before the other
//   if (
//     a.transactions[0].createdAt.getTime() >
//     b.transactions[0].createdAt.getTime()
//   )
//     return -1;
//   if (
//     b.transactions[0].createdAt.getTime() <
//     a.transactions[0].createdAt.getTime()
//   )
//     return 1;

//   return 0;
// }

// function compareRecentTransactions(a, b) {
//   //compares two time stamps and places the earlier timestamp before the other
//   if (a.transaction.createdAt.getTime() > b.transaction.createdAt.getTime())
//     return -1;
//   if (b.transaction.createdAt.getTime() < a.transaction.createdAt.getTime())
//     return 1;

//   return 0;
// }

// function compareRecentDebts(a, b) {
//   //compares two time stamps and places the earlier timestamp before the other
//   if (a.debt.createdAt.getTime() > b.debt.createdAt.getTime()) return -1;
//   if (b.debt.createdAt.getTime() < a.debt.createdAt.getTime()) return 1;

//   return 0;
// }
