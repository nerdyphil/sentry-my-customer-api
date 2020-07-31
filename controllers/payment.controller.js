const axios = require("axios");
const { errorHandler } = require("./login_controler");
const PaymentModel = require("../models/payment");
const { signToken } = require("./login_controler");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
});

exports.create = async (req, res) => {
  try {
    const api_key = signToken(
      {
        user_role: "store_admin",
      },
      "87600h"
    );
    const payment = new PaymentModel({
      transaction: req.params.transaction_id,
      status: "unverified",
    });

    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${payment.transaction}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWARE_PRI}`,
        },
      }
    );
    if (response.data.status === "success") {
      payment.status = "verified";
    }
    payment.data = response.data;
    await payment.save();
    const message = `You have successfully made a payment of ${payment.data.data.currency.toUpperCase()} ${
      payment.data.data.amount
    } to a store on Mycustomer`;
    const to = "+" + payment.data.data.customer.phone_number;
    const sms = africastalking.SMS;
    try {
      const response = await sms.send({
        to,
        message: message,
        enque: true,
      });
    } catch (error) {
      //  An error occurred while trying to send an sms
      console.log(error);
    }

    return res.status(200).json({
      success: true,
      message: "Payment created",
      data: { ...payment.data, api_key },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
