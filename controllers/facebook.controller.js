require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const axios = require("axios");
const queryString = require("query-string");
const facebookUser = require("../models/store_admin");

//Generate a facebook URL
exports.urlFacebook = (req, res) => {
  const query = queryString.stringify({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URL,
    scope: ["email"],
    response_type: "code",
    auth_type: "rerequest",
    display: "popup",
  });
  res.status(201).send({
    success: true,
    message: "Signup link generated",
    data: {
      url: `https://www.facebook.com/v4.0/dialog/oauth?${query}`,
    },
  });
};

async function getToken(code) {
  const { data } = await axios({
    url: "https://graph.facebook.com/v4.0/oauth/access_token",
    method: "get",
    params: {
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URL,
      code,
    },
  });
  return data.access_token;
}

async function getFacebookData(access_token) {
  const { data } = await axios({
    url: "https://graph.facebook.com/me",
    method: "get",
    params: {
      fields: ["id", "email", "first_name", "last_name"].join(","),
      access_token: access_token,
    },
  });
  return data;
}

//response from login
exports.getFacebookAccountFromCode = async (req, res) => {
  try {
    const res_token = await getToken(req.query.code);
    const facebook = await getFacebookData(res_token);

    let user = await facebookUser.findOne({
      identifier: facebook.email,
    });
    console.log(user);
    const token = jwt.sign(
      {
        name: facebook.first_name + facebook.last_name,
        email: facebook.email,
      },
      process.env.JWT_KEY
    );

    if (!user) {
      const newUser = new facebookUser({});
      (newUser.identifier = facebook.email),
        (newUser.facebook.first_name = facebook.first_name),
        (newUser.facebook.last_name = facebook.last_name),
        (newUser.facebook.email = facebook.email),
        (newUser.facebook.api_token = token),
        (newUser.facebook.facebookId = facebook.id);
      user = await newUser.save();
    }
    if (user && !user.facebook.facebookId) {
      user.update({
        facebook: {
          first_name: facebook.first_name,
          last_name: facebook.last_name,
          email: facebook.email,
          api_token: token,
          facebookId: facebook.id,
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
