const Complaint = require("../models/complaint_form");
// const User = require("../models/user");

const StoreOwner = require("../models/store_admin");
const { check, validationResult } = require("express-validator/check");
const { errorHandler } = require("./login_controler");
const onFinished = require("on-finished");
const Activity = require("../models/activity");

// @route       GET /complaints
// @desc        Store admin retrieves all Complaints
// @access      Private
exports.findAll = async (req, res) => {
  // Finds all complaints pertaining to store owner
  try {
    // const complaints = await Complaint.find({ storeOwner: req.params.ownerId });
    let complaints;
    let countData;
    if (req.user.user_role === "store_assistant") {
      complaints = await Complaint.find({
        store_id: req.user.store_id
      }).sort({ date: -1 });
      countData = {
        new: await Complaint.countDocuments({
          store_id: req.user.store_id,
          status: "New"
        }),
        pending: await Complaint.countDocuments({
          store_id: req.user.store_id,
          status: "Pending"
        }),
        resolved: await Complaint.countDocuments({
          store_id: req.user.store_id,
          status: "Resolved"
        }),
        closed: await Complaint.countDocuments({
          store_id: req.user.store_id,
          status: "Closed"
        })
      };
    } else {
      complaints = await Complaint.find({
        storeOwnerPhone: req.user.phone_number
      }).sort({ date: -1 });
      countData = {
        new: await Complaint.countDocuments({
          storeOwnerPhone: req.user.phone_number,
          status: "New"
        }),
        pending: await Complaint.countDocuments({
          storeOwnerPhone: req.user.phone_number,
          status: "Pending"
        }),
        resolved: await Complaint.countDocuments({
          storeOwnerPhone: req.user.phone_number,
          status: "Resolved"
        }),
        closed: await Complaint.countDocuments({
          storeOwnerPhone: req.user.phone_number,
          status: "Closed"
        })
      };
    }

    res.status(200).send({
      success: true,
      message: "All complaints",
      data: {
        statusCode: 200,
        complaints,
        ...countData
      }
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error fetching complaints",
      data: {
        statusCode: 422,
        error: error.message
      }
    });
  }
};

// @route       GET /complaint/:complaintId
// @desc        Store Admin retrieves a single complaint
// @access      Private
exports.findOne = async (req, res) => {
  try {
    const { complaintId } = req.params;

    // const storeAdmin = await StoreOwner.findById(ownerId);

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      res.status(422).send({
        success: false,
        message: "Error fetching complaint",
        data: {
          statusCode: 422,
          error: error.message
        }
      });
    }

    res.status(200).send({
      success: true,
      message: "Complaint fetched",
      data: {
        statusCode: 200,
        complaint
      }
    });
  } catch (error) {
    res.status(422).send({
      success: false,
      message: "Error fetching complaint",
      data: {
        statusCode: 422,
        error: error.message
      }
    });
  }
};

// @route       PUT /complaints/update/:complaintId
// @desc        Super Admin updates status of complaints
// @access      Private
exports.update = async (req, res) => {
  const { status } = req.body;
  // const store_admin_id = req.params.ownerId;

  // Build contact object
  // Based on the fields submitted, check to see if submitted
  const statusFields = {};

  if (status) statusFields.status = status;

  try {
    const { complaintId } = req.params;

    // Super admin user role
    const adminUser = await StoreOwner.find({
      identifier: req.user.phone_number
    });

    // Complaint
    let complaint = await Complaint.findById(complaintId);

    // If complaint don't exist
    if (!complaint)
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });

    let userRole;

    adminUser.forEach(admin => {
      userRole = admin.local.user_role;
    });

    // Ensure it's the Super Admin
    if (userRole !== "super_admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorised! Only Super Admin can Update Complaint!"
      });
    }

    // Update complaint status
    complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      { $set: statusFields },
      { new: true }
    );

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
      message: "Complaint updated!",
      data: {
        statusCode: 200,
        complaint
      }
    });
  } catch (error) {
    res.status(422).send({
      success: false,
      message: "Error updating complaint",
      data: {
        statusCode: 422,
        error: error.message
      }
    });
  }
};

// @route PUT /store-admin/update-complaints/:complaintId
//@desc Allows Store owner edit the contents of complains from his store
//@access Private
exports.updateComplaint = async (req, res) => {
  try {
    const user = await StoreOwner.findOne({
      $or: [{ _id: req.user._id }, { _id: req.user.store_admin_ref }],
    });
    const { subject, message } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
        error: {
          statusCode: 401
        }
      });
    }

    let complaint;
    if (req.user.user_role === "store_admin") {
      complaint = await Complaint.findOne({
        _id: req.params.complaintId,
        storeOwner: user._id,
      });
    } else {
      complaint = await Complaint.findOne({
        _id: req.params.complaintId,
        storeOwner: user._id,
        store_id: req.user.store_id,
      });
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Could not find complaint",
        error: {
          statusCode: 404
        }
      });
    }

    complaint.subject = subject || complaint.subject;
    complaint.message = message || complaint.message;
    complaint = await complaint.save();

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
      message: "complaint updated",
      data: complaint
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    const user = await StoreOwner.findOne({
      $or: [{ _id: req.user._id }, { _id: req.user.store_admin_ref }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
        error: {
          statusCode: 401
        }
      });
    }


    let complaint;
    if (req.user.user_role === "store_admin") {
      complaint = await Complaint.findOne({
        _id: req.params.complaintId,
        storeOwner: user._id,
      });
    } else {
      complaint = await Complaint.findOne({
        _id: req.params.complaintId,
        storeOwner: user._id,
        store_id: req.user.store_id,
      });
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Could not find complaint",
        error: {
          statusCode: 404
        }
      });
    }

    complaint = await complaint.remove();

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
      message: "complaint deleted",
      data: complaint
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// @route       DELETE /complaint/delete/:complaintId
// @desc        Super Admin deletes complaint
// @access      Private
exports.deleteOne = async (req, res) => {
  try {
    const { complaintId } = req.params;

    // Super admin user role
    const adminUser = await StoreOwner.find({
      identifier: req.user.phone_number
    });

    // Complaint
    const complaint = await Complaint.findById(complaintId);

    // If complaint don't exist
    if (!complaint)
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });

    let userRole;

    adminUser.forEach(admin => {
      userRole = admin.local.user_role;
    });

    if (userRole !== "super_admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorised! Only Super Admin can Delete Complaint!"
      });
    }

    await Complaint.findByIdAndRemove(complaint);

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
      message: "Complaint successfully deleted",
      data: {
        statusCode: 200
        // complaint
      }
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error deleting complaint",
      data: {
        statusCode: 500,
        error: error.message
      }
    });
  }
};

// create and register new complaint
// @route       POST /complaint/new/
// @desc        Public creates complaints to store Owner admins
// @access      Private
exports.newComplaint = async (req, res) => {
  // Validate body request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "fields must be at least 11 characters long",
      errors: errors.array()
    });
  }

  // Deconstruct req body
  const { name, email, subject, message } = req.body;

  try {
    // Get Store Owner Id from the URL Parameter
    let storeOwner = await StoreOwner.findOne({
      _id: req.user.store_admin_ref
    });

    // console.log(storeOwner.local);

    // return;
    // console.log(storeOwner);

    // If Id exists, create complaint
    let newComplaint = await Complaint({
      store_id: req.user.store_id,
      name:
        storeOwner.local.first_name.toString() +
        " " +
        storeOwner.local.last_name.toString(),
      email: storeOwner.local.email,
      subject,
      message,
      storeOwner: storeOwner._id,
      storeOwnerPhone: storeOwner.identifier
    });

    // urlStoreOwner.complaints.push(newComplaint);

    // const complaint = await urlStoreOwner.save();
    const complaint = await newComplaint.save();

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
    res.json({
      success: true,
      message: "Complaint successfully created!",
      data: {
        statusCode: 200,
        complaint
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send({
      success: false,
      message: "Server Error!",
      data: {
        statusCode: 500,
        error: err.message
      }
    });
  }
};

// @route       GET /complaints/all
// @desc        Super Admin Gets all Complaints in DB
// @access      Private
exports.getAllComplaintsInDB = async (req, res) => {
  try {
    // User who logs in
    const adminUser = await StoreOwner.find({
      identifier: req.user.phone_number
    });
    console.log(adminUser);
    let userRole;

    adminUser.forEach(admin => {
      userRole = admin.local.user_role;
    });

    // Ensure it's the Super Admin
    if (userRole !== "super_admin") {
      return res.status(401).json({
        success: false,
        message: "Unauthorised! Only Super Admin can get all Complaint!"
      });
    }

    // All complaints
    const complaints = await Complaint.find({}).sort({ date: -1 });

    // If complaint don't exist
    if (!complaints)
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });

    res.status(200).json({
      success: true,
      message: "All complaints in the database!",
      data: complaints,
      complaintCounts: {
        new: await Complaint.countDocuments({
          status: "New"
        }),
        pending: await Complaint.countDocuments({
          status: "Pending"
        }),
        resolved: await Complaint.countDocuments({
          status: "Resolved"
        }),
        closed: await Complaint.countDocuments({
          status: "Closed"
        })
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: err.message
      }
    });
  }
};

/**
 *  MESSAGING ROUTES
 *
 *  Enable User to get feedback directly from the
 *  Super Admin User through chat messages.
 *
 */

// @route       POST /complaint/feedback/:complaintId
// @desc        Store Admin and Super Admin create feebacks
// @access      Private
exports.createFeedbacks = async (req, res) => {
  // const { user, messages } = req.body

  try {
    const { complaintId } = req.params;

    let storeOwner = await StoreOwner.findOne({
      identifier: req.user.phone_number
    });

    // Complaint Schema
    const complaint = await Complaint.findById(complaintId);

    // console.log(complaint);
    // Check if there's complaint
    if (!complaint) {
      return res.status(401).send({
        success: false,
        message: "Complaint not found!",
        data: {
          statusCode: 404,
          error: error.message
        }
      });
    }

    // console.log(storeOwner.local.user_role);

    // If complaint, push feedback to complaint as array
    complaint.feedbacks.push({
      user: storeOwner._id,
      userPhone: req.user.phone_number,
      userRole: storeOwner.local.user_role,
      messages: req.body.messages
    });

    let feedbacks = await complaint.save();

    // Return response
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
      message: "Feedback created!",
      data: {
        statusCode: 201,
        feedbacks: feedbacks.feedbacks
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: err.message
      }
    });
  }
};

// @route       GET /complaint/feedbacks/:complaintId
// @desc        Store Admin and Super Admin get feebacks
// @access      Private
exports.getFeedbacks = async (req, res) => {
  try {
    const { complaintId } = req.params;

    let userAdmin = await StoreOwner.findOne({
      identifier: req.user.phone_number
    });

    const complaints = await Complaint.findById(complaintId);

    // console.log(complaints.storeOwnerPhone, req.user.phone_number)

    // Check Authorised user
    // if (userAdmin.local.user_role !== "super_admin" || complaints.storeOwnerPhone !== userAdmin)
    // {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Unauthorised admin user!",
    //   });
    // }

    let feedbacks = complaints.feedbacks;

    // Send response
    res.status(200).json({
      success: true,
      message: "All Feedbacks for this Complaint!",
      data: {
        statusCode: 200,
        feedbacks
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: err.message
      }
    });
  }
};

// @route       GET /complaint/feedback/:complaintId/:feedbackId
// @desc        Get single feedback by id
// @access      Private
exports.getFeedback = async (req, res) => {
  try {
    const { complaintId, feedbackId } = req.params;

    let userAdmin = await StoreOwner.findOne({
      identifier: req.user.phone_number
    });

    const complaints = await Complaint.findById(complaintId);

    let feedbacks = complaints.feedbacks;

    // Loop and check feedbacks by id and return
    feedbacks.forEach(feedback => {
      if (feedback._id == feedbackId) {
        // feedbackGotten = feedback;

        return res.status(200).json({
          success: true,
          message: "Single feedback gotten!",
          data: {
            statusCode: 200,
            feedback
          }
        });
      }

      if (feedback._id !== feedbackId) {
        return res.status(404).json({
          success: false,
          error: {
            statusCode: 404,
            message: `No feedback of id ${feedbackId} found!`
          }
        });
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: err.message
      }
    });
  }
};

// @route       DELETE /complaint/feedback/:complaintId/:feedbackId
// @desc        delete feedback by id
// @access      Private
exports.deleteFeedback = async (req, res) => {
  try {
    const { complaintId, feedbackId } = req.params;

    let userAdmin = await StoreOwner.findOne({
      identifier: req.user.phone_number
    });

    const complaints = await Complaint.findById(complaintId);

    // Check if User is Super Admin
    if (userAdmin.local.user_role !== "super_admin") {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorised admin user! Only a Super Admin can delete feedbacks!"
      });
    }

    let feedbacks = complaints.feedbacks;

    feedbacks.forEach((feedback, index) => {
      if (feedback._id == feedbackId) {
        feedbacks.splice(index, 1);
      }
    });

    // Save to DB
    await complaints.save();
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
      message: "Feedback deleted successfully",
      data: {
        statusCode: 200,
        feedbacks
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: err.message
      }
    });
  }
};

// @route       DELETE /complaint/feedback/:complaintId/
// @desc        Delete all Feedbacks
// @access      Private
exports.deleteAllFeedbacks = async (req, res) => {
  try {
    const { complaintId, feedbackId } = req.params;

    let userAdmin = await StoreOwner.findOne({
      identifier: req.user.phone_number
    });

    const complaints = await Complaint.findById(complaintId);

    // Check if User is Super Admin
    if (userAdmin.local.user_role !== "super_admin") {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorised admin user! Only a Super Admin can delete feedbacks!"
      });
    }

    let feedbacks = complaints.feedbacks;

    // Delete all feedbacks
    feedbacks.splice(0, feedbacks.length);

    // Save to DB
    await complaints.save();
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
      message: "All feedback deleted successfully",
      data: {
        statusCode: 200,
        feedbacks
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: err.message
      }
    });
  }
};
