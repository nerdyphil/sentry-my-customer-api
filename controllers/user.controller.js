const User = require("../models/store_admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator/check");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const responseManager = require('../util/response_manager');
const DataUri = require('datauri/parser');
const path = require('path');
const {uploader} = require('./cloudinaryController')

exports.validate = method => {
  switch (method) {
    case "body": {
      return [
        body("phone_number").isInt(),
        body("name").matches(/^[0-9a-zA-Z]{2,}$/, "i"),
      ];
    }
    case "store_admin": {
      return [
        body("phone_number").isInt(),
        body("first_name").isString(),
        body("last_name").isString(),
        body("email").isEmail(),
      ];
    }
  }
};

///#region Get all Users.
exports.all = (req, res) => {
  const id = req.user.phone_number;
  User.findOne({ identifier: id })
    .then((user) => {
      const storeAssistants = user.assistants;
      res.status(200).json({
        success: "true",
        message: "Successfully retrieved all store assistants",
        data: {
          statusCode: 200,
          assistants: storeAssistants,
        },
      });
    })
    .catch((err) => {
      res.status(500).send({
        success: "false",
        message: "Internal Error",
        error: {
          statusCode: 500,
          message: "Could not retrive users due to an internal error",
        },
      });
    });
};
//#endregion

//Add new user

exports.new = async (req, res) => {
  const { name, email, password, phone_number } = req.body;

  // Check if Phone exists
  let userExists = await User.findOne({ identifier: req.user.phone_number });
  if (userExists === null) {
    let userExists = await User.findOne({
      identifier: req.user.phone_number.toString(),
    });
    if (userExists) {
      // userExists.local.api_token = token;
      userExists.assistants.push({
        name: name,
        email: email,
        password: password,
        phone_number: phone_number,
      });
      await userExists
        .save()
        .then((user) => {
          return res.status(200).json({
            success: "true",
            message: "Assistant Added Successfully",
            data: {
              statusCode: 200,
              assistant: userExists.assistants,
              user: user,
            },
          });
        })
        .catch((err) => {
          return res.status(500).json({
            success: "false",
            message: "Error",
            data: {
              statusCode: 500,
              error: err.message,
            },
          });
        });
    } else {
      return res.status(404).json({
        success: "false",
        message: "User Not Found",
        data: {
          statusCode: 404,
          error: "User Dosen't Exist",
        },
      });
    }
  } else {
    if (userExists) {
      // userExists.local.api_token = token;
      userExists.assistants.push({
        name: name,
        email: email,
        password: password,
        phone_number: phone_number,
      });
      await userExists
        .save()
        .then((user) => {
          return res.status(200).json({
            success: "true",
            message: "Assistant Added Successfully",
            data: {
              statusCode: 200,
              assistant: userExists.assistants,
              user: user,
            },
          });
        })
        .catch((err) => {
          return res.status(500).json({
            success: "false",
            message: "Error",
            data: {
              statusCode: 500,
              error: err.message,
            },
          });
        });
    } else {
      return res.status(404).json({
        success: "false",
        message: "User Not Found",
        data: {
          statusCode: 404,
          error: "User Dosen't Exist",
        },
      });
    }
  }
};

//#region Fnd a single user with a user_id
exports.getById = (req, res) => {
  const identifier = req.user.phone_number;
  const assistantId = req.params.assistant_id;
  let found = false;
  User.findOne({ identifier }).then((user) => {
    let assistants = user.assistants;
    let dataArr = [];
    assistants.forEach((assistant) => {
      if (assistant._id == assistantId) {
        found = true;
        dataArr.push(assistant);
      }
    });
    if (found == true) {
      return res.status(200).json({
        success: true,
        message: "Assistant found",
        data: {
          statusCode: 200,
          assistantData: dataArr[0],
        },
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Assistant not found",
        error: {
          statusCode: 404,
          message: "Assistant not found with id " + assistantId,
        },
      });
    }
  });
};

exports.update = async (req, res) => {
  const userFields = req.body;
  try {
    let user = await User.findOne({
      identifier: "0" + req.user.phone_number.toString(),
    });
    if (user == null) {
      let user = await User.findOne({
        identifier: req.user.phone_number.toString(),
      });
      if (!user)
        return res.status(404).json({
          success: "false",
          message: "User not found",
          error: {
            statusCode: 404,
            message: "User with the provided details does not exist",
          },
        });

      // Update Assistant
      //user = await User.findById(req.params.assistant_id);
      // ,
      //     { $set: {assistants: userFields} },
      //     { new: true }
      // Send updated user details
      if (user.assistants.length !== 0) {
        user.assistants.map((assist) => {
          if (assist._id.equals(req.params.assistant_id)) {
            (assist.name = req.body.name),
              (assist.email = req.body.email),
              (assist.phone_number = req.body.phone_number);
          }
        });
        user
          .save()
          .then((userSaved) => {
            res.status(201).json({
              success: "true",
              message: "Assistants details updated successfully",
              data: {
                statusCode: 201,
                data: userSaved,
              },
            });
          })
          .catch((err) => {
            res.status(500).json({
              success: "false",
              message: "Internal server error",
              error: {
                statusCode: 500,
                message: "Assistant details could not be updated",
              },
            });
          });
      } else {
        res.status(500).json({
          success: "false",
          message: "You have no assistants yet",
          error: {
            statusCode: 500,
            message: "You have no assistants yet",
          },
        });
      }
    } else {
      if (!user)
        return res.status(404).json({
          success: "false",
          message: "User not found",
          error: {
            statusCode: 404,
            message: "User with the provided details does not exist",
          },
        });

      // Update Assistant
      //user = await User.findById(req.params.assistant_id);
      // ,
      //     { $set: {assistants: userFields} },
      //     { new: true }
      // Send updated user details
      if (user.assistants.length !== 0) {
        user.assistants.map((assist) => {
          if (assist._id.equals(req.params.assistant_id)) {
            (assist.name = req.body.name),
              (assist.email = req.body.email),
              (assist.phone_number = req.body.phone_number);
          }
        });
        user
          .save()
          .then((userSaved) => {
            res.status(201).json({
              success: "true",
              message: "Assistants details updated successfully",
              data: {
                statusCode: 201,
                data: userSaved,
              },
            });
          })
          .catch((err) => {
            res.status(500).json({
              success: "false",
              message: "Internal server error",
              error: {
                statusCode: 500,
                message: "Assistant details could not be updated",
              },
            });
          });
      } else {
        res.status(500).json({
          success: "false",
          message:
            "You can't update assistants yet because you have no one presently",
          error: {
            statusCode: 500,
            message: "You have no assistants yet",
          },
        });
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: "false",
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: "Assistant details could not be updated",
      },
    });
  }
};
//#endregion

//#region Delete a user the user_id
exports.delete = (req, res) => {
  User.findByIdAndRemove(req.params.user_id)
    .then((user) => {
      if (!user) {
        return res.status(404).send({
          success: "false",
          message: "User not found",
          error: {
            statusCode: 404,
            message: "User not found with id " + req.params.user_id,
          },
        });
      } else {
        res.status(200).json({
          success: "true",
          message: "User deleted successfully",
          error: {
            statusCode: 200,
            message:
              "User with id " + req.params.user_id + " has been deleted ",
            data: user,
          },
        });
      }
    })
    .catch((err) => {
      if (err.kind === "ObjectId" || err.name === "NotFound") {
        return res.status(404).json({
          success: "false",
          message: "User delete failed",
          error: {
            statusCode: 404,
            message:
              "User with id: " + req.params.user_id + " could not be found ",
          },
        });
      }
      return res.status(500).send({
        success: "false",
        message: "User delete failed",
        error: {
          statusCode: 404,
          message:
            "User with id: " +
            req.params.user_id +
            " could not be deleted due to an internal error",
        },
      });
    });
};
//#endregion

exports.updateStoreAdmin = (req, res) => {
  const identifier = req.user.phone_number;
  User.findOne({ identifier })
    .then((user) => {
      user.local.phone_number = req.body.phone_number;
      user.local.first_name = req.body.first_name;
      user.local.last_name = req.body.last_name;
      user.local.email = req.body.email;
      user
        .save()
        .then((result) => {
          res.status(200).json({
            success: true,
            message: "Store admin updated successfully",
            data: {
              store_admin: result,
            },
          });
        })
        .catch((error) => {
          res.status(500).json({
            status: false,
            message: error.message,
            error: {
              code: 500,
              message: error.message,
            },
          });
        });
    })
    .catch((error) => {
      res.status(500).json({
        status: false,
        message: error.message,
        error: {
          code: 500,
          message: error.message,
        },
      });
    });
}

exports.reset = async (req, res) => {
  const phone_number = req.body.phone_number.toString();
  let duser = await User.findOne({identifier: phone_number});
  const password = await bcrypt.hash(req.body.password, 10);
  if (!duser) {
    duser = await User.findOne({identifier: ('0' + phone_number)})
    if (!duser) {
    return  res.status(404).json({
      success: false,
      message: err.message,
      data: {
          statusCode: 404
      }
      })
    }
    duser.local.password = password;

    duser.save()
    .then((user) => {

      return res.status(200).json({
        success: true,
        message: "Password Changed Succesfully",
        data: {
            statusCode: 200,
            user: user
        }
      })

    }, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
          data: {
              statusCode: 400
          }
        })
      }

    })
    .catch((err) => {
      return res.status(400).json({
        success: false,
        message: err.message,
        data: {
            statusCode: 400
        }
      })
    })
  }
  duser.local.password = password;

  duser.save()
  .then((user) => {

    return res.status(200).json({
      success: true,
      message: "Password Changed Succesfully",
      data: {
          statusCode: 200,
          user: user
      }
    })

  }, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
        data: {
            statusCode: 400
        }
      })
    }

  })
  .catch((err) => {
    return res.status(400).json({
      success: false,
      message: err.message,
      data: {
          statusCode: 400
      }
    })
  })
};

exports.forgot = async (req, res)  => {
  await crypto.randomBytes(20, function(err, buf) {
    let token = buf.toString('hex');
    if (err) {
      next(err)
    }

    User.findOne({ identifier: req.body.phone_number }, function(err, user) {
      if (err) {
        return res.status(404).json({
          success: "false",
          message: "Error finding user in DB",
          data: {
              statusCode: 404,
              error: err.message
          }
      })
      }
      if (!user) {
      return res.status(404).json({
          success: "false",
          message: "User Not Found. Make sure you inputted right phone number",
          data: {
              statusCode: 404,
              error: "User Dosen't Exist"
          }
      })
      }
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      user.save((err) => {
        if (err) {
          return res.status(404).json({
            success: "false",
            message: "Error saving user",
            data: {
                statusCode: 404,
                error: err.message
            }
        })
        }
          let smtpTransport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: 'openhand95@gmail.com',
              pass: 'Juwon@1234'
            }
          });
          let mailOptions = {
            to: user.local.email,
            from: 'passwordreset@mycustomer.com',
            subject: 'Mycustomer Password Reset',
            text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
              'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
              'http://' + req.headers.host + '/store_admin/forgot-password/' + token + '\n\n' +
              'If you did not request this, please ignore this email and your password will remain unchanged.\n'
          };
          smtpTransport.sendMail(mailOptions, function(err, info) {
            if (err) {
              return res.status(400).json({
                success: "false",
                message: "Error sending email.Possibly User has no email",
                data: {
                    statusCode: 400,
                    error: err.message
                }
            })
            }
          return res.status(200).json({
              success: "true",
              message: "Email Sent" + info.response,
              data: {
                  statusCode: 200,
                  message: 'An e-mail has been sent to ' + user.local.email + ' with further instructions.'
              }
          })
            // if (err) {
            //   next(err)
            // }
            // res.redirect('/store_admin/forgot-password');
          });
      }, (user) => {
        let smtpTransport = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'openhand95@gmail.com',
            pass: 'Juwon@1234'
          }
        });
        let mailOptions = {
          to: user.local.email,
          from: 'passwordreset@mycustomer.com',
          subject: 'Mycustomer Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err, info) {
          if (err) {
            return res.status(400).json({
              success: "false",
              message: "Error sending email. Possibly User has no email",
              data: {
                  statusCode: 400,
                  error: err.message
              }
          })
          }
        return res.status(200).json({
            success: "true",
            message: "Email Sent" + info.response,
            data: {
                statusCode: 200,
                message: 'An e-mail has been sent to ' + user.local.email + ' with further instructions.'
            }
        })
          // if (err) {
          //   next(err)
          // }
          // res.redirect('/store_admin/forgot-password');
        });
      });



    });



  });
}

exports.tokenreset = async(req, res) => {
  if (req.body.password === undefined || req.body.password == "") {
    return res.status(400).json({
      success: "false",
      message: "Password Can't Be Empty",
      data: {
        statusCode: 400,
        error: "password is required"
    }
  })
  }
  const password = await bcrypt.hash(req.body.password, 10);
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } },
  function(err, user) {
    if (err) {
      return res.status(400).json({
        success: "false",
        message: "Error From DB",
        data: {
          statusCode: 400,
          error: err.message
      }
    })
    }
    if (!user) {
      return res.status(400).json({
        success: "false",
        message: "Password Reset Token Is Invalid or has expired",
        data: {
          statusCode: 400,
          error: "Invalid Token"
      }
    })
  }
    user.local.password = password;
    user.resetPasswordToken = undefined; //turn reset password to something not needed
    user.resetPasswordExpires = undefined;

    user.save(function(err) {
      if (err) {
        return res.status(400).json({
          success: "false",
          message: "Couldn't save to DB",
          data: {
            statusCode: 400,
            error: err.message
          }
        }) 
      }
      let smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'openhand95@gmail.com',
          pass: 'Juwon@1234'
        }
      });
      let mailOptions = {
        to: user.local.email,
        from: 'mycustomer@customer.com',
        subject: 'Your MyCustomer Account password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        if (err) {
          return res.status(200).json({
            success: "false",
            message: "Password Changed Succesfully. But Error Sending Email Notification",
            data: {
              statusCode: 200,
              error: err.message
          }
        })
        }
        return res.status(200).json({
          success: "true",
          message: "Email Notification Sent",
          data: {
            statusCode: 200,
            message: "Password Changed Succesfully"
        }
      })
    });

    });
  });
  }

exports.updatePicture = (req,res) => {
  // check if an image is uploaded 
  if(!req.file){
    return responseManager.failure(res,{message: "Upload a picture"},400)
  }

  // use dataUri to convert image from buffer to dataUri
  let dturi = new DataUri();

  let dataUri = dturi.format(path.extname(req.file.originalname),req.file.buffer);
  const file = dataUri.content
  // upload the image using cloudinary
  uploader.upload(file)
    .then((result) => {
    // update the user image to this image
    User.updateOne({identifier: req.user.phone_number},{$set: {image: result.url}})
    .then((dbResult) => {
      // if the user is not found throw an error
      if(!dbResult.n){
        return responseManager.failure(res,{message: "User not found"},404)
        };
        // successful response
        return responseManager.success(res,{message: `Image updated. New imgage url : ${result.url}`},200)
    })
    .catch((err) => {
      console.log(err)
      return responseManager.failure(res,{message: "Picture not set. Unexpected error occured"});
    })
  })
  .catch((err) => {
    console.log(err)
    return responseManager.failure(res,{message: "Picture not set. Unexpected error occured"});
  })
}
