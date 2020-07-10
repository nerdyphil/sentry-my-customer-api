const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require("mongoose"),
  Store = require("./store"),
  StoreAssistant = require("./storeAssistant"),
  Complaints = require("./complaint_form");

const storeAdminSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, unique: true },
    local: {
      phone_number: { type: Number, unique: true, sparse: true },
      first_name: { type: String, default: "Not set" },
      last_name: { type: String, default: "Not set" },
      email: { type: String, default: "Not set" },
      is_active: { type: Boolean, default: 0 },
      password: { type: String },
      user_role: { type: String, default: "store_admin" },
    },
    google: {
      first_name: { type: String },
      last_name: { type: String },
      email: { type: String },
      googleId: { type: String },
      api_token: { type: String },
      user_role: { type: String, default: "store_admin" },
    },
    facebook: {
      //facebook login data
      first_name: { type: String },
      last_name: { type: String },
      email: { type: String },
      facebookId: { type: String },
      api_token: { type: String },
      user_role: {
        type: String,
        default: "store_admin",
      },
    },

    assistants: [StoreAssistant.schema],
    stores: [Store.schema],
    complaints: [Complaints.schema], // To take in Complaints and save to DB
    api_token: {
      type: String,
    },  
    resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    },
    image: {
      type: String,
      required: true,
      default: 'https://res.cloudinary.com/dl8587hyx/image/upload/v1594302398/user-default_zcpir8.png'
    }
}, {timestamps: true});

storeAdminSchema.pre("save", function (next) {
  const user = this;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(10, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

storeAdminSchema.methods.comparePassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

storeAdminSchema.methods.generateJWT = function() {
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 900);

    let payload = {
        id: this._id,
        email: this.email,
        username: this.username,
        firstName: this.firstName,
        lastName: this.lastName,
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: parseInt(expirationDate.getTime() / 1000, 10)
    });
};

storeAdminSchema.methods.generatePasswordReset = function() {
    this.resetPasswordToken = crypto.randomBytes(6).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000; //expires in an hour
};

mongoose.set('useFindAndModify', false);

module.exports = mongoose.model("store_admin", storeAdminSchema);
