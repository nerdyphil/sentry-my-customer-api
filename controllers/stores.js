const Store = require("./../models/store");
const UserModel = require("../models/store_admin");
const CustomerModel = require("../models/customer");
const Assistants = require("../models/storeAssistant");
const TransactionModel = require("../models/transaction");
const { body } = require("express-validator/check");
const onFinished = require("on-finished");
const Activity = require("../models/activity");
const { errorHandler } = require("./login_controler");
const { storeService } = require("../services");

exports.validate = method => {
  switch (method) {
    case "body": {
      return [
        body("store_name").isString(),
        body("shop_address").isString(),
        body("tagline").isString(),
        body("phone_number")
          .optional()
          .isNumeric()
          .withMessage("please enter a valid number")
      ];
    }
  }
};

exports.createStore = async (req, res) => {
  if (req.body.store_name === "" || req.body.shop_address === "") {
    return res.status(500).json({
      success: false,
      message: "Missing fields"
    });
  }
  try {
    req.body.store_admin_ref = req.user._id;
    const store = await Store.create(req.body);
    await onFinished(res, async (err, res) => {
      /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
      const { method, originalUrl, httpVersion, headers, body, params } = req;
      /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
      await Activity.create({
        creator_ref: req.user._id,
        method,
        originalUrl,
        httpVersion,
        headers,
        body,
        params
      });
      // const activity = await Activity.findOne({"body.phone_number": "2348136814497"});
      // console.log(activity);
    });
    return res.status(201).json({
      success: true,
      message: "Store added successfully",
      data: {
        statusCode: 201,
        store
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.getAllStores = async (req, res) => {
  //current user's id to find user
  try {
    let stores;
    if (req.user.user_role === "super_admin") {
      stores = await storeService.getAllStores({});
    } else {
      stores = (await storeService.getAllStores({
        store_admin_ref: req.user.store_admin_ref
      })).map(elem => elem[0]);
    }
    res.status(200).json({
      success: true,
      result: stores.length,
      message: "Here are all your stores",
      data: {
        statusCode: 200,
        stores
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.getStore = async (req, res) => {
  try {
    //find store and fill in data og store admin
    let store = await Store.findOne({
      _id: req.params.store_id
    })
      .populate({
        path: "store_admin_ref"
      })
      .exec();

    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }
    let customers = await CustomerModel.find({ store_ref_id: store._id });
    customers = await Promise.all(
      customers.map(async customer => {
        const transactions = await TransactionModel.find({
          customer_ref_id: customer._id
        });
        return { ...customer.toObject(), transactions };
      })
    );
    let assistants = await Assistants.find({ store_ref_id: store._id });
    store = { tagline: "Not Set", ...store.toObject(), customers, assistants };
    const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const s_t = month => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      t.setMonth(month, 1);
      const s = new Date();
      s.setMonth(month, 31);
      s.setHours(24, 0, 0, 0);
      return {
        createdAt: {
          $gte: t,
          $lt: s
        }
      };
    };
    const transactionChart = await months.reduce(async (acc, month) => {
      acc = await acc;
      const transactions = await TransactionModel.countDocuments({
        store_ref_id: store._id,
        ...s_t(month)
      });
      return [...acc, transactions];
    }, []);
    return res.status(200).json({
      success: true,
      message: "Operation successful",
      data: {
        store,
        currency: store.store_admin_ref.currencyPreference,
        transactionChart
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.updateStore = async (req, res) => {
  try {
    let store = await Store.findOne({
      _id: req.params.store_id
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }
    store.store_name = req.body.store_name || store.store_name;
    store.phone_number = req.body.phone_number || store.phone_number;
    store.tagline = req.body.tagline || store.tagline;
    store.email = req.body.email || store.email;
    store.shop_address = req.body.shop_address || store.shop_address;
    store = await store.save();
    await onFinished(res, async (err, res) => {
      /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
      const { method, originalUrl, httpVersion, headers, body, params } = req;
      /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
      await Activity.create({
        creator_ref: req.user._id,
        method,
        originalUrl,
        httpVersion,
        headers,
        body,
        params
      });
      // const activity = await Activity.findOne({"body.phone_number": "2348136814497"});
      // console.log(activity);
    });
    res.status(201).json({
      success: true,
      message: "Store updated successfully",
      data: {
        statusCode: 201,
        store
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.deleteStore = async (req, res, next) => {
  try {
    let store = await Store.findOne({
      _id: req.params.store_id
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }
    await TransactionModel.deleteMany({ store_ref_id: store._id });
    await CustomerModel.deleteMany({ store_ref_id: store._id });
    await store.remove();
    await onFinished(res, async (err, res) => {
      /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
      const { method, originalUrl, httpVersion, headers, body, params } = req;
      /*console.log({
            method,
            originalUrl,
            httpVersion,
            headers,
            body,
            params
          });*/
      await Activity.create({
        creator_ref: req.user._id,
        method,
        originalUrl,
        httpVersion,
        headers,
        body,
        params
      });
      // const activity = await Activity.findOne({"body.phone_number": "2348136814497"});
      // console.log(activity);
    });
    res.status(200).json({
      success: true,
      message: "Store deleted successfully",
      data: {
        statusCode: 200,
        store
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
