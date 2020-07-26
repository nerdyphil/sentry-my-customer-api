const UserModel = require("../models/store_admin");
const StoreModel = require("../models/store");
const CustomerModel = require("../models/customer");
const Numbers = require("twilio/lib/rest/Numbers");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
});
const { storeService } = require("../services");
const { errorHandler } = require("./login_controler");

exports.getCustomer = async (req, res) => {
  if (req.user.user_role === "super_admin") {
    CustomerModel.find({})
      .then((customers) => {
        let customers_number = {};
        customers.map((customer) => {
          customers_number[customer.name] = customer.phone_number;
        });
        return res.status(200).json({
          success: true,
          data: customers_number,
        });
      })
      .catch((err) => {
        return res.status(500).json({
          success: false,
          message: "Something went wrong",
          error: err,
        });
      });
  }
  try {
    const stores = await storeService.getAllStores({
      $or: [{ store_admin_ref: req.user._id }, { _id: req.user.store_id }],
    });
    const data = stores.reduce((acc, cur) => {
      return {
        ...acc,
        ...cur[0].customers.reduce(
          (ac, cu) => ({ ...ac, [cu.name]: cu.phone_number }),
          {}
        ),
      };
    }, {});
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.send = async (req, res) => {
  const { message, numbers } = req.body;

  if (!message || !numbers) {
    return res.ststus(400).json({
      success: false,
      message: "Please provide the required parameters",
    });
  }

  const identifier = req.user.phone_number;
  UserModel.findOne({ identifier })
    .then((user) => {
      //filtering out Nigerian numbers form the number array
      const nigerianNo = numbers.filter((number) => number.charAt(0) == "2");

      //filtering out Indian numbers form the number array
      const indianNo = numbers.filter((number) => number.charAt(0) == "9");

      if (nigerianNo.length == 0 && indianNo.length == 0) {
        return res.status(400).json({
          success: false,
          message: "Could not send message to any of the provided numbers",
        });
      }

      let formattedNg = [];
      let formattedIn = [];

      //adding "+" to the numbers to meet africanstalking format
      nigerianNo.forEach((no) => {
        formattedNg.push("+" + no);
      });

      if (formattedNg.length > 0) {
        //Sms gateway for Nigerian numbers
        const sms = africastalking.SMS;
        sms
          .send({
            to: formattedNg,
            message,
            enque: true,
          })
          .then((response) => {
            console.log(response);
          })
          .catch((err) => {
            res.status(500).json({
              success: false,
              error: err,
            });
          });
      }

      if (indianNo.length > 0) {
        //Indian sms gateway goes here
      }

      res.status(200).json({
        success: true,
        message: "Message sent",
      });
    })
    .catch((err) => {
      return res.status(500).json({
        error: err,
      });
    });
};
