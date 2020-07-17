const Complaint = require("../models/complaint_form");
// const User = require("../models/user");

const StoreOwner = require('../models/store_admin');
const { check, validationResult } = require('express-validator/check');

// @route       GET /complaints
// @desc        Store admin retrieves all Complaints
// @access      Private
exports.findAll = async (req, res) => {
  
  // Finds all complaints pertaining to store owner
  try {

    // const complaints = await Complaint.find({ storeOwner: req.params.ownerId });
    const complaints = await Complaint.find({ storeOwnerPhone: req.user.phone_number });
  
    res.status(200).send({
      success: true,
      message: "All complaints",
      data: {
        statusCode: 200,
        complaints
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
}

// @route       PUT /complaints/update/:complaintId
// @desc        Super Admin updates status of complaints
// @access      Public
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
    const adminUser = await StoreOwner.find({ identifier: req.user.phone_number });
    
    // Complaint
    let complaint = await Complaint.findById(complaintId);

    // If complaint don't exist
    if (!complaint) return res.status(404).json({
      success: false,
      message: "Complaint not found",
    });

    let userRole;

    adminUser.forEach(admin => {
      userRole = admin.local.user_role;
    })

    // Ensure it's the Super Admin
    if (userRole !== 'super_admin') {
      return res.status(401).json({
        success: false,
        message: "Unauthorised! Only Super Admin can Update Complaint!",
      });
    }

    // Update complaint status
    complaint = await Complaint.findByIdAndUpdate(complaintId,
      { $set: statusFields },
      { new: true }
    );

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


// @route       DELETE /complaint/delete/:ownerId
// @desc        Super Admin deletes complaint
// @access      Private
exports.deleteOne = async (req, res) => {
  
  try {    
    const { complaintId } = req.params;

    // Super admin user role
    const adminUser = await StoreOwner.find({ identifier: req.user.phone_number });
    
    // Complaint
    const complaint = await Complaint.findById(complaintId);

    // If complaint don't exist
    if (!complaint) return res.status(404).json({
      success: false,
      message: "Complaint not found",
    });

    let userRole;

    adminUser.forEach(admin => {
      userRole = admin.local.user_role;
    })

    if (userRole !== 'super_admin') {
      return res.status(401).json({
        success: false,
        message: "Unauthorised! Only Super Admin can Delete Complaint!",
      });
    }

    await Complaint.findByIdAndRemove(complaint);

    res.status(200).send({
      success: true,
      message: "Complaint successfully deleted",
      data: {
        statusCode: 200, 
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
// @route       POST /complaint/new/:ownerId
// @desc        Public creates complaints to store Owner admins
// @access      Public
exports.newComplaint = async (req, res) => {

  // Validate body request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Deconstruct req body
  const { name, email, subject, message } = req.body

  try {
    // Get Store Owner Id from the URL Parameter
    let storeOwner = await StoreOwner.findOne({ identifier: req.user.phone_number });

    // console.log(storeOwner.local);

    // return;
    // console.log(storeOwner);

    // If Id exists, create complaint
    let newComplaint = await Complaint({
      name: storeOwner.local.first_name.toString() + " " + storeOwner.local.last_name.toString(), 
      email: storeOwner.local.email,
      subject,
      message,
      storeOwner: storeOwner._id,
      storeOwnerPhone: req.user.phone_number
    });

    // urlStoreOwner.complaints.push(newComplaint);

    // const complaint = await urlStoreOwner.save();
    const complaint = await newComplaint.save();

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


// @route       GET /complaint/new/:ownerId
// @desc        Store Admin Gets all Complaints in DB
// @access      Private
exports.getAllComplaintsInDB = async (req, res) => {
  try {
    // User who logs in
    const adminUser = await StoreOwner.find({ identifier: req.user.phone_number });
    console.log(adminUser)
    let userRole;

    adminUser.forEach(admin => {
      userRole = admin.local.user_role;
    })

    // Ensure it's the Super Admin
    if (userRole !== 'super_admin') {
      return res.status(401).json({
        success: false,
        message: "Unauthorised! Only Super Admin can get all Complaint!",
      });
    }

    // All complaints
    const complaints = await Complaint.find({ });

    // If complaint don't exist
    if (!complaints) return res.status(404).json({
      success: false,
      message: "Complaint not found",
    });

    res.status(200).json({
      success: true,
      message: "All complaints in the database!",
      data: complaints
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
}
