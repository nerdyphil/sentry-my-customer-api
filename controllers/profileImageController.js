require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const User = require("../models/store_admin");
const Assistant = require("../models/storeAssistant");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { errorHandler } = require("./login_controler");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => "mycustomer-profile-photos",
    format: async (req, file) => "jpg",
    height: "500",
    width: "500",
  },
});

module.exports.imageParser = (req, res) => {
  const parser = multer({
    storage: storage,
  });
  return parser;
};

module.exports.updateImage = async (req, res) => {
  let imageUrl, filename;
  if (req.file) {
    imageUrl = req.file.path;
    filename = req.file.filename;
  } else {
    return res.status(400).json({
      success: false,
      message: "No image provided",
      error: {
        statusCode: 400,
        message: "No image provided",
      },
    });
  }
  try {
    let user;
    if (req.user.user_role !== "store_assistant") {
      user = await User.findOne({ _id: req.user._id });
    } else {
      user = await Assistant.findOne({ _id: req.user._id });
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
        error: {
          statusCode: 401,
        },
      });
    }
    cloudinary.uploader.destroy(user.image.filename);
    user.image = {
      path: imageUrl,
      filename,
    };
    user = await user.save();
    return res.status(200).json({
      success: true,
      message: "Profile image updated",
      data: {
        statusCode: 200,
        image: imageUrl,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
