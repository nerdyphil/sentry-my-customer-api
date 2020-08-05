const axios = require("axios");
const { errorHandler } = require("./login_controler");
const PaymentModel = require("../models/payment");
const { signToken } = require("./login_controler");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
});
const onFinished = require("on-finished");
const Activity = require("../models/activity");

exports.create = async (req, res) => {
  try {
    const api_key = signToken(
      {
        user_role: "store_admin"
      },
      "87600h"
    );
    const payment = new PaymentModel({
      transaction: req.params.transaction_id,
      status: "unverified"
    });

    const response = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${payment.transaction}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWARE_PRI}`
        }
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
        enque: true
      });
    } catch (error) {
      //  An error occurred while trying to send an sms
      console.log(error);
    }

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
    return res.status(200).json({
      success: true,
      message: "Payment created",
      data: { ...payment.data, api_key }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
