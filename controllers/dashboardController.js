const userModel = require("../models/user");
const storeAdminModel = require("../models/store_admin");
const storeAssistantModel = require("../models/storeAssistant");
const storeModel = require("../models/store");
const customerModel = require("../models/customer");

exports.storeAdminDashboard = async (req, res, next) => {
  const identifier = req.user.phone_number;
  const role = req.user.user_role;

  if (role != "store_admin") {
    return next();
  }

  const storeAdmin = await storeAdminModel.findOne({ identifier });
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
    data.recentDebts = []

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
          obj.transactions = customer.transactions.sort(compareTransactions);
          data.transactions.push(obj);

          const transactions = customer.transactions
          transactions.forEach(transaction => {
            //push in details of each transaction
            let obj ={};
            obj.storeName = store.store_name;
            obj.customerName = customer.name;
            obj.transaction = transaction;
            data.recentTransactions.push(obj);

            if (transaction.debts.length != 0) {
              const debts = transaction.debts;
              debts.forEach(debt => {
                //push in details of each debt
                let obj = {}
                obj.storeName = store.store_name;
                obj.customerName = customer.name;
                obj.debt = debt;
                data.recentDebts.push(obj);
              })
              
            }

          })

        }
      });
    });

    // sort transactions and debts by date in descending order
    data.transactions.sort(compareCustomers);
    data.recentTransactions.sort(compareRecentTransactions);
    data.recentDebts.sort(compareRecentDebts);

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
        message: error
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

exports.storeAssistantDashboard = (req, res) => {

}

exports.customerDashboard = async (req, res) => {
  const phone_number = req.user.phone_number;
  const data = [];
  try {
    const storeAdmin = await storeAdminModel.aggregate(
      [ 
        { $unwind: '$stores'},
        { $unwind: '$stores.customers'},
        { $match: {'stores.customers.phone_number':phone_number}}
    ]);
     
    if (storeAdmin.length == 0) {
      res.status(404).send({
        success: false,
        message: 'Customer store has no admin',
        error: {
          statusCode: 400,
          message: 'Customer store has no admin'
        }
      })
    }
    
    const store = storeAdmin[0].stores;
    if (!store) {
      res.status(404).send({
        success: false,
        message: 'Customer does not belong to a store',
        error: {
          statusCode: 400,
          message: 'Customer does not belong to a store'
        }
      })
    }
    
    if (storeAdmin.length == 1) {
      const customer = store.customers
      //sort customer transactions and debts by date
      customer.transactions.sort(compareTransactions);
      if (customer.transactions.debts) {
        customer.transactions.debts.sort(compareTransactions); 
      }  
      res.status(200).send({
        success: true,
        message: 'Customer dashboard data',
        data: storeAdmin
      })
    }
    
    storeAdmin.forEach(admin => {
      const store = admin.stores;
      const customer = store.customers
      //sort customer transactions and debts by date
      customer.transactions.sort(compareTransactions);
      if (customer.transactions.debts) {
        customer.transactions.debts.sort(compareTransactions); 
      } 
      data.push(admin);
    })

    res.status(200).send({
      success: true,
      message: 'Customer dashboard data',
      data: storeAdmin
    })
    
  } catch (error) {
    res.status(500).send({
      success: false,
      message:'Internal server error',
      error:{
        statusCode: 500,
        message: error.message
      }
    })
  }
}

//utility functions
function compareTransactions(a, b) {
  //compares two time stamps and places the earlier timestamp before the other
  if (
    a.createdAt.getTime() > b.createdAt.getTime()
  )
    return -1;
  if (
    b.createdAt.getTime() < a.createdAt.getTime()
  )
    return 1;

  return 0;
}

function compareCustomers(a, b) {
  //compares two time stamps and places the earlier timestamp before the other
  if (
    a.transactions[0].createdAt.getTime() > b.transactions[0].createdAt.getTime()
  )
    return -1;
  if (
    b.transactions[0].createdAt.getTime() < a.transactions[0].createdAt.getTime()
  )
    return 1;

  return 0;
}

function compareRecentTransactions(a, b) {
  //compares two time stamps and places the earlier timestamp before the other
  if (
    a.transaction.createdAt.getTime() > b.transaction.createdAt.getTime()
  )
    return -1;
  if (
    b.transaction.createdAt.getTime() < a.transaction.createdAt.getTime()
  )
    return 1;

  return 0;
}

function compareRecentDebts(a, b) {
  //compares two time stamps and places the earlier timestamp before the other
  if (
    a.debt.createdAt.getTime() > b.debt.createdAt.getTime()
  )
    return -1;
  if (
    b.debt.createdAt.getTime() < a.debt.createdAt.getTime()
  )
    return 1;

  return 0;
}
