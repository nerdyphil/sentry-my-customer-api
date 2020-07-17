const { google } = require("googleapis");
require("dotenv").config();
const jwt = require("jsonwebtoken");
//const User = require("../models/user");
const googleUser = require("../models/store_admin");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

// generate a url that asks permissions for user's data
const scopes = ["email", "profile"];

exports.urlGoogle = async (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",

    // If you only need one scope you can pass it as a string
    scope: scopes,
    prompt: "consent",
  });
  res.status(201).send({
    success: true,
    message: "Signup link generated",
    data: {
      url,
    },
  });
};
exports.getGoogleAccountFromCode = async (req, res) => {
  try {
    const code = req.query.code;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });
    const getUserData = async () => {
      let googleResponse;
      try {
        googleResponse = await oauth2.userinfo.get();
      } catch (err) {
        console.log(err);
      }
      return googleResponse.data;
    };
    const userData = await getUserData();
    let user = await googleUser.findOne({
      identifier: userData.email,
    });

    if (!user) {
      const newUser = new googleUser({});
      (newUser.identifier = userData.email),
        (newUser.google.first_name = userData.given_name),
        (newUser.google.last_name = userData.family_name),
        (newUser.google.email = userData.email),
        (newUser.google.googleId = userData.id),
        (newUser.google.picture = userData.picture);
      user = await newUser.save();
      console.log(user);
    }
    if (user && !user.google.googleId) {
      user.update({
        google: {
          first_name: userData.given_name,
          last_name: userData.family_name,
          email: userData.email,
          googleId: userData.id,
        },
      });
    }
    const payload = {
      newUser: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_KEY,
      {
        expiresIn: 360000,
      },
      (err, token, data) => {
        if (err) throw err;
        return res.status(200).send({
          success: true,
          message: "User signed in successfully",
          data: {
            user,
            token,
          },
        });
      }
    );
  } catch (e) {
    res.status(400).send({
      success: false,
      message: "Error signing user in",
      error: e,
    });
  }
};
