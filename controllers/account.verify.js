const Banks = require("../models/banks");
const UserModel = require("../models/store_admin");
const { errorHandler } = require("./login_controler");
const request = require("request");
const { SEC_KEY } = process.env;

exports.resolve = async (req, res) => {
  try {
    const { account_bank, account_number } = req.body;
    var options = {
      method: "POST",
      url: "https://api.flutterwave.com/v3/accounts/resolve",
      headers: {
        "Content-Type": "application/json",
        Authorization: SEC_KEY
      },
      body: JSON.stringify({
        account_number,
        account_bank
      })
    };
    request(options, function(error, response) {
      if (error) throw new Error(error);
      return res.status(200).send(JSON.parse(response.body));
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.list = async (req, res) => {
  var options = {
    method: "GET",
    url: "https://api.flutterwave.com/v3/banks/NG",
    headers: {
      Authorization: SEC_KEY
    }
  };
  request(options, function(error, response) {
    if (error) throw new Error(error);
    return res.status(200).send(JSON.parse(response.body));
  });
};
