const UserModel = require("../models/store_admin");
const StoreModel = require("../models/store");
const CustomerModel = require("../models/customer");
const BroadcastMessage = require("../models/broadcast_messages");
const Numbers = require("twilio/lib/rest/Numbers");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
});
const { storeService } = require("../services");
const { errorHandler } = require("./login_controler");
const onFinished = require("on-finished");
const Activity = require("../models/activity");

exports.getCustomer = async (req, res) => {
  if (req.user.user_role === "super_admin") {
    CustomerModel.find({})
      .then(customers => {
        let customers_number = {};
        customers.map(customer => {
          customers_number[customer.name] = customer.phone_number;
        });
        return res.status(200).json({
          success: true,
          data: customers_number
        });
      })
      .catch(err => {
        return res.status(500).json({
          success: false,
          message: "Something went wrong",
          error: err
        });
      });
  }
  try {
    const stores = await storeService.getAllStores({
      $or: [{ store_admin_ref: req.user._id }, { _id: req.user.store_id }]
    }); // This returns array of stores [[{...storedata}]]

    const data = stores.reduce((acc, cur) => {
      return {
        ...acc,
        ...cur[0].customers.reduce(
          (ac, cu) => ({ ...ac, [cu.name]: cu.phone_number }), // returns object with names as keys and phone as values
          {}
        ) //  This loops through the customers of a store
      }; //  returns an object of spread customers
    }, {}); // This loops over said array exposing another array.
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.send = async (req, res) => {
  const { message, numbers } = req.body;

  if (!message || !numbers) {
    return res.status(400).json({
      success: false,
      message: "Please provide the required parameters",
      error: {
        statusCode: 400,
        message: "Please provide the required parameters"
      }
    });
  }

  const identifier = req.user.phone_number;
  UserModel.findOne({ identifier })
    .catch(err => {
      return res.status(500).json({
        success: false,
        message: "Store admin does not exist",
        error: {
          statusCode: 404,
          message: "Store admin does not exist"
        }
      });
    })
    .then(async user => {
      //filtering out Nigerian numbers form the number array
      const nigerianNo = numbers.filter(
        number => String(number).charAt(0) == "2"
      );

      //filtering out Indian numbers form the number array
      const indianNo = numbers.filter(
        number => String(number).charAt(0) == "9"
      );

      if (nigerianNo.length == 0 && indianNo.length == 0) {
        return res.status(400).json({
          success: false,
          message: "Could not send message to any of the provided numbers",
          error: {
            statusCode: 400,
            message: "Could not send message to any of the provided numbers"
          }
        });
      }
      var messageSentNG = false;
      //could not send data out of promise so I had to do this
      var messageErrorNG = "The supplied authentication in incorrect";
      let formattedNg = [];
      let formattedIn = [];

      //adding "+" to the numbers to meet africanstalking format
      nigerianNo.forEach(no => {
        formattedNg.push("+" + no);
      });

      if (formattedNg.length > 0) {
        //Sms gateway for Nigerian numbers
        const sms = africastalking.SMS;
        sms
          .send({
            to: formattedNg,
            message: message
          })
          .then(async response => {
            const newMessage = new BroadcastMessage({
              senderPhone: identifier,
              message: message,
              numbers: formattedNg
            });
            //save message to database
            const messageSent = await BroadcastMessage.create(newMessage);
            if (messageSent) {
              await onFinished(res, async (err, res) => {
                /*console.log(req.method, req.url, "HTTP/" + req.httpVersion);
          for (var name in req.headers)
            console.log(name + ":", req.headers[name]);*/
                const {
                  method,
                  originalUrl,
                  httpVersion,
                  headers,
                  body,
                  params
                } = req;
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
                message: "Messages sent successfully",
                data: {
                  statusCode: 200,
                  message: "mesages sent successfully",
                  recipients: response.SMSMessageData.Recipients
                }
              });
            }
          })
          .catch(error => {
            res.status(400).json({
              success: false,
              message: "messages not sent",
              error: {
                statusCode: 400,
                message: error
              }
            });
          });
      }

      if (indianNo.length > 0) {
        //Indian sms gateway goes here
      }
    });
};

exports.getBroadcasts = async (req, res) => {
  try {
    // Get Broadcasts of Sender
    const broadcasts = await BroadcastMessage.find({
      senderPhone: req.user.phone_number
    }).sort({ date: -1 });

    res.status(200).send({
      success: true,
      message: "All User's Broadcast messages",
      data: {
        statusCode: 200,
        broadcasts
      }
    });
  } catch (err) {
    res.status(422).send({
      success: false,
      message: "Error fetching user's broadcast messages!",
      data: {
        statusCode: 422,
        error: err.message
      }
    });
  }
};

exports.getSingleBroadcast = async (req, res) => {
  try {
    const { broadcastId } = req.params;

    const broadcast = await BroadcastMessage.findById(broadcastId);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: "Error getting broadcast message by id",
        data: {
          statusCode: 404
        }
      });
    }

    res.status(200).send({
      success: true,
      message: "Broadcast message gotten!",
      data: {
        statusCode: 200,
        broadcast
      }
    });
  } catch (err) {
    res.status(422).send({
      success: false,
      message: "Error fetching broadcast message!",
      data: {
        statusCode: 422,
        error: err.message
      }
    });
  }
};

exports.deleteSingleBroadcast = async (req, res) => {
  try {
    const { broadcastId } = req.params;

    const broadcast = await BroadcastMessage.findById(broadcastId);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: "Error getting broadcast message by id",
        data: {
          statusCode: 404
        }
      });
    }

    // Delete broadcast by ID
    await BroadcastMessage.findByIdAndRemove(broadcast);

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
    res.status(200).send({
      success: true,
      message: "Broadcast message successfully deleted",
      data: {
        statusCode: 200
      }
    });
  } catch (err) {
    res.status(422).send({
      success: false,
      message: "Error fetching broadcast message!",
      data: {
        statusCode: 422,
        error: err.message
      }
    });
  }
};
