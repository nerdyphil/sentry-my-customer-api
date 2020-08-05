const nodemailer = require("nodemailer"),
  userModel = require("../models/store_admin"),
  CustomerModel = require("../models/customer"),
  StoreModel = require("../models/store"),
  onFinished = require("on-finished"),
  Activity = require("../models/activity");

module.exports = {
  sendMail: () => async (req, res) => {
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.MAIL_SERVICE,
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD
        }
      });
      if (!req.body.store_id || !req.body.html || !req.body.subject) {
        const html = req.body.html ? {} : { html: 'Path "html" is required' },
          store_id = req.body.store_id
            ? {}
            : { store_id: 'Path "store_id" is required' },
          subject = req.body.subject
            ? {}
            : { subject: 'Path "subject" is required' };
        return res.status(422).json({
          success: false,
          message: "Your request is missing required fields",
          error: {
            code: 422,
            errors: {
              ...html,
              ...store_id,
              ...subject
            }
          }
        });
      }

      //Find a customer and get the email
      const identifier = req.user.phone_number;
      const customer_id = req.params.customer_id;
      const store_id = req.body.store_id;

      const user = await userModel.findOne({ identifier });
      if (!user) {
        return res.status(401).json({
          message: "Forbidden",
          success: false,
          error: {
            code: 401,
            message: "You cannot access this resource"
          }
        });
      }

      const store = await StoreModel.findById(store_id);

      if (!store) {
        return res.status(404).json({
          success: false,
          message: "Not found",
          error: {
            message: "Could not find store",
            code: 404
          }
        });
      }
      const customer = await CustomerModel.findById(customer_id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Not found",
          error: {
            message: "Could not find customer",
            code: 404
          }
        });
      }
      if (!customer.email) {
        return res.status(400).json({
          success: false,
          message: "Missing requirement",
          error: {
            code: 400,
            message: "customer does not have a registered email"
          }
        });
      }

      const mailOptions = {
        from: store.store_name,
        to: customer.email,
        subject: req.body.subject,
        html: req.body.html
      };
      return transporter.sendMail(mailOptions, async (err, data) => {
        if (err) {
          return res.status(err.status || 500).json({
            success: false,
            message: "An unexpected error occurred",
            error: {
              ...err,
              message: err.message
            }
          });
        } else {
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
            message: "Email sent successfully",
            data
          });
        }
      });
    } catch (error) {
      return res.status(500).json({
        message: "An unexpected error occurred",
        success: false,
        error: {
          code: 500,
          message: error.message
        }
      });
    }
  }
};
