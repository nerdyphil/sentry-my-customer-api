const UserModel = require("../models/store_admin");
const StoreModel = require('../models/store');
const { body } = require('express-validator/check');
const Customer = require('../models/customer');

exports.validate = (method) => {
  switch (method) {
    case 'body': {
      return [
        body('name').isLength({ min: 3 }),
      ]
    }
  }
}

exports.create = async (req, res) => {
  const identifier = req.user.phone_number;

  const { phone_number, email, name, store_id } = req.body;

  //get current user's id and add a new customer to it
  try {
    UserModel.findOne({ identifier })
      .then((user) => {
        if (user.stores.length == 0) {
          return res.status(403).json({
            message: "please add a store before adding customers",
          });
        }
        // let store_name = req.body.store_name || req.params.store_name;
        // let wantedStore = user.stores.find(
        //   (store) => store.store_name === store_name
        // ); // find the necessary store form user.stores

        const wantedStore = user.stores.id(store_id);

        let customerToReg = { phone_number, email, name }; // customer to register
        let customerExists = wantedStore.customers.find(
          (customer) => customer.phone_number == customerToReg.phone_number
        ); //truthy if customer is registered
        // return res.send(wantedStore);

        if (!customerExists) {
          // if customer isn't registered
          wantedStore.customers.push(customerToReg); //push to user.stores
          // return res.status(200).json({ wantedStore });
        } else {
          return res.status(409).json({
            sucess: false,
            message: "Customer already registered",
            data: {
              statusCode: 409,
            },
          });
        }

        user
          .save()
          .then((result) => {
            res.status(201).json({
              success: true,
              message: "Customer registration successful",
              data: {
                statusCode: 201,
                customer: customerToReg,
              },
            });
          })
          .catch((err) => {
            return res.status(500).json({
              success: false,
              message: "Error saving to database",
              data: {
                statusCode: 500,
                err,
              },
            });
          });
      })
      .catch((err) => {
        return res.status(404).json({
          success: false,
          error: {
            statusCode: 404,
            error: "No customer found for current user",
          },
        });
      });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while adding customer.",
      data: {
        statusCode: 500,
        error: err,
      },
    });
  }
};

exports.getById = (req, res) => {
  const identifier = req.user.phone_number;
  let customers;
  UserModel.findOne({ identifier })
    .then((user) => {
      let store = user.stores.id(req.params.storeId);
      customers = store.customers;

      const customer = customers.id(req.params.customerId);

      if (!customer) {
        return res.status(404).json({
          status: false,
          message: "Customer not found",
          error: {
            statusCode: 404,
            message: "customer not found",
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: "successful",
        data: {
          statusCode: 200,
          customer,
          storeName: store.store_name, 
          storeId: store._id
        },
      });
    }).catch((error) => {
      return res.status(404).json({
        status: false,
        message: error.message,
        error: {
          statusCode: 404,
          message: error,
        },
      });
    });
};

exports.updateById = (req, res) => {
  const identifier = req.user.phone_number;
  const customerId = req.params.customerId;
  const { name, phone_number, email, store_id } = req.body;
  
  UserModel.findOne({identifier})
  .then((user) => {
    const stores = user.stores;

    const store = stores.id(store_id);

    const customers = store.customers;

    const customer = customers.id(customerId);

    if (!customer) {
      return res.status(400).json({
        status: false,
        message: "Cannot find customer",
        error: {
          statusCode: 400,
          message: error
        }
      });
    }

    customer.name = name ? name : customer.name;
    customer.phone_number = phone_number ? phone_number : customer.phone_number;
    customer.email = email ? email : customer.email;

    user.save()
      .then(() => {
        return res.status(200).json({
          success: true,
          message: "Customer updated successfully.",
          data: {
            statusCode: 200,
            customer: user.stores.id(store_id).customers.id(customerId)
          },
        });    
      })
      .catch((error) => {
        res.status(500).json({
          status: false,
          message: "Error updating customer",
          error: {
            statusCode: 500,
            message: error.message
          }
        });
      });
  })
  .catch((error) => {
    res.status(500).json({
      status: false,
      message: error.message,
      error: {
        statusCode: 500,
        message: error
      }
    });
  })
};

exports.deleteById = (req, res) => {
  const identifier = req.user.phone_number;
  let customers;
  UserModel.findOne({ identifier })
    .then((user) => {
      let stores = user.stores;
      stores.forEach((store) => {
        customers = store.customers;
        if (customers.length > 0) {
          customers.forEach((customer, index) => {
            if (customer._id == req.params.customerId) {
              customers.splice(index, 1);
            }
          });
        }
      });
      user
        .save()
        .then((result) => {
          res.status(200).json({
            success: true,
            message: "Customer deleted successful",
            data: {
              statusCode: 200,
            },
          });
        })
        .catch((err) => {
          return res.status(500).json({
            success: false,
            message: "Error deleting customer",
            data: {
              statusCode: 500,
              err,
            },
          });
        });
    })
    .catch((err) => {
      return res.status(404).json({
        status: false,
        message: "Customer not found",
        error: {
          statusCode: 404,
          message: "customer not found",
        },
      });
    });
};

exports.getAll = async (req, res) => {
  const identifier = req.user.phone_number;
  UserModel.findOne({ identifier })
    .then((user) => {
      let store = user.stores;
      let customer = [];

      store.forEach((store) => {
        let obj = {};
        obj.storeName = store.store_name;
        obj.customers = store.customers;
        obj.storeId = store._id;

        customer.push(obj);
      });
      return res.status(200).json({
        success: true,
        message: "Operation successful",
        data: {
          statusCode: 200,
          customer
        }
      });
    })
    .catch((err) => {
      return res.status(404).json({
        success: false,
        message: "No customer associated with this user account",
        error: {
          code: 404,
          message: "No customer associated with this user account",
        },
      });
    });
};
