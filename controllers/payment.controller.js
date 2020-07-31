const axios = require("axios");
const { errorHandler } = require("./login_controler");
const PaymentModel = require("../models/payment");
const { signToken } = require("./login_controler");

exports.create = async (req, res) => {
  try {
    const api_key = signToken(
      {
        user_role: "super_admin",
      },
      "87600h"
    );

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

    return res.status(200).json({
      success: true,
      message: "Payment created",
      data: { ...payment.data, api_key },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
