require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const User = require("../models/store_admin");
const Assistant = require("../models/storeAssistant");
const {
    CloudinaryStorage
} = require("multer-storage-cloudinary");

 cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET
 });
 const storage = new CloudinaryStorage({
     cloudinary: cloudinary,
     params: {
         folder: (req, file) => "mycustomer-profile-photos",
         format: async (req, file) => 'jpg',
         height: '500',
         width: '500',
     },
 });
 
 module.exports.imageParser = (req, res)=>{
     const parser = multer({
         storage: storage
     });
    return parser;
 }

module.exports.updateImage = (req, res) => {
        let imageUrl, filename;
        const identifier = req.user.phone_number;
        if(req.file){
            imageUrl = req.file.path;
            filename = req.file.filename;
        }else{
            return res.status(400).json({
                success: false,
                message: "No image provided",
                error: {
                    statusCode: 400,
                    message: "No image provided"
                }
            });
        }
        //find the store admin
        try{
            User.findOne({ identifier }).then(async user =>{
                cloudinary.uploader.destroy(user.image.filename);
                user.image.path = imageUrl;
                user.image.filename = filename;
                await user.save();
                return res.status(200).json({
                    success: true,
                    message: "Profile image updated successfully",
                    data: {
                        statusCode: 200,
                        image: imageUrl
                    }
                });
            });
        }
        //or store assistant
        catch{
            Assistant.findOne({ phone_number: identifier }).then(async assistant =>{
                assistant.image = imageUrl;
                await assistant.save();
                return res.status(200).json({
                    success: true,
                    message: "Profile image updated successfully",
                    data: {
                        statusCode: 200,
                        image: imageUrl
                    }
                })
            }).catch(error =>{
                res.status(404).json({
                    success: false,
                    message: "Could not find that user",
                    error:{
                        statusCode: 404,
                        message: "Could not find that user"
                    }
                });
            });
        }
};
