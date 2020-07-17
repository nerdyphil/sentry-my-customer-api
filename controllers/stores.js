const Store = require("./../models/store");
const UserModel = require("../models/store_admin");

exports.createStore = async (req, res, next) => {
  if (req.body.store_name === "" || req.body.shop_address === "") {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
  try {
    const id = req.user.phone_number;
    const storeOwner = await UserModel.findOne({ identifier: id });
    if (storeOwner) {
      storeOwner.stores.push(
        //   {
        //   store_name: req.body.store_name,
        //   shop_address: req.body.shop_address,
        //   tagline: req.body.tagline,
        //   phone_number:req.body.phone_number,
        //   email:req.body.email,
        // }
        req.body
      );
      storeOwner
        .save()
        .catch(error => {
          res.send(error);
        })
        .then(store => {
          res.status(201).json({
            success: true,
            message: "Store added successfully",
            data: {
              statusCode: 201,
              store: store
            }
          });
        });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: {}
    });
  }
};

exports.getAll = async (req, res, next) => {
  const id = req.user.phone_number;
  try {
    const User = await UserModel.findOne({ identifier: id });
    if (!User) {
      return res.status(404).json({
        success: false,
        message: "could not User",
        error: {
          statusCode: 404,
          message: "Could not find User"
        }
      });
    } else {
      if (User.local.user_role !== "super_admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorised, resource can only accessed by Super Admin",
          error: {
            statusCode: 401,
            message: "Unauthorised, resource can only accessed by Super Admin"
          }
        });
      } else {
        let stores = [];
        let users = await UserModel.find({});
        users.forEach(user => {
          let store = user.stores;
          stores.push(store);
        });

        res.status(200).json({
          success: true,
          result: stores.length,
          message: "Here are all your stores Super Admin",
          data: {
            statusCode: 200,
            stores
          }
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: {}
    });
  }
};

exports.getAllStores = async (req, res, next) => {
  //current user's id to find user
  const id = req.user.phone_number;
  try {
    const store_admin = await UserModel.findOne({ identifier: id });
    if (!store_admin) {
      return res.status(404).json({
        success: false,
        message: "could not find store_admin",
        error: {
          statusCode: 404,
          message: "Could not find store admin"
        }
      });
    } else {
      let stores = store_admin.stores;
      res.status(200).json({
        success: true,
        result: stores.length,
        message: "Here are all your stores",
        data: {
          statusCode: 200,
          stores
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: {}
    });
  }
};

exports.getStore = async (req, res, next) => {
  const identifier = req.user.phone_number;
  let found = false;

  UserModel.findOne({ identifier })
    .then(result => {
      let stores = result.stores;
      stores.forEach(store => {
        if (store._id == req.params.store_id) {
          found = true;
          return res.status(200).json({
            success: true,
            message: "Operation successful",
            data: {
              store
            }
          });
        }
      });
      if (found == false) {
        res.status(404).json({
          success: false,
          Message: "Store not found",
          error: {
            statusCode: 404,
            message: "Store not found"
          }
        });
      }
    })
    .catch(err => {
      return res.status(404).json({
        success: false,
        Message: "User not found",
        error: {
          statusCode: 404,
          message: err
        }
      });
    });
};

exports.updateStore = async (req, res, next) => {
  try {
    const id = req.user.phone_number;
    const content = req.body;
    const store_id = req.params.store_id;
    const storeOwner = await UserModel.findOne({ identifier: id });
    if (storeOwner) {
      const stores = storeOwner.stores;
      stores.forEach(store => {
        if (store._id.equals(store_id)) {
          store.shop_address = req.body.shop_address;
          store.store_name = req.body.store_name;
          store.tagline = req.body.tagline;
          store.email = req.body.email;
          store.phone_number = req.body.phone_number;
          storeOwner
            .save()
            .then(success => {
              res.status(201).json({
                success: true,
                message: "Store updated successfully",
                data: {
                  statusCode: 201,
                  store: store
                }
              });
            })
            .catch(error => {
              res.status(401).json({
                success: false,
                message: "Failed to update store",
                error: {
                  statusCode: 401,
                  message: error.message
                }
              });
            });
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: {}
    });
  }
};

exports.deleteStore = async (req, res, next) => {
  try {
    const id = req.user.phone_number;
    const storeOwner = await UserModel.findOne({ identifier: id });
    if (storeOwner) {
      const stores = storeOwner.stores.filter(
        store => store._id != req.params.store_id
      );
      storeOwner.stores = stores;
      storeOwner
        .save()
        .catch(error => {
          res.status(500).json({
            success: false,
            message: "Internal error",
            error: {
              statusCode: 500,
              message: "Could delete store due to an internal error"
            }
          });
        })
        .then(store => {
          res.status(200).json({
            success: true,
            message: "Store deleted successfully",
            data: {
              statusCode: 200,
              store: store
            }
          });
        });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: {}
    });
  }
};
