const axios = require("axios");
const { errorHandler } = require("./login_controler");
const PaymentModel = require("../models/payment");
const { transactionService } = require("../services");
const { signToken } = require("./login_controler");

exports.create = async (req, res) => {
  try {
    const transaction = await transactionService.getOneTransaction({
      _id: req.params.transaction_id,
    });
    if (!transaction)
      return res.status(404).json({
        success: false,
        message: "no transaction with that ID",
        error: {
          statusCode: 404,
        },
      });
    const api_key = signToken(
      { user_role: "store_admin", _id: transaction.store_admin_ref._id },
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

    return res.status(200).json({
      success: true,
      message: "Payment created",
      data: { ...payment.data, api_key },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
