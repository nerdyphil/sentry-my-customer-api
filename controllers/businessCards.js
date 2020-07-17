const UserStore = require("../models/user_store");
const UserModel = require("../models/store_admin");

module.exports = () => async (req, res) => {
  try {
    const { user_role = null, phone_number = null } = req.user;

    //  Enable business card feature for only store admin
    if (!user_role || user_role !== "store_admin") {
      return res.status(403).json({
        message: "You can't access this resource",
        status: 403,
        user_role: req.user,
      });
    }

    const user = await UserModel.findOne({ identifier: phone_number });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Please signin first", status: 401 });
    }

    //  Get all stores owned by user
    const userStores = user.stores;

    //  Iterate through stores and create cards
    const data = userStores.map((store) => {
      const { store_name, phone_number, email, shop_address } = store;

      return {
        ownerName: `${user.local.first_name} ${user.local.last_name}`,
        storeName: store_name,
        email: email || user.local.email,
        phone: phone_number || user.local.phone_number,
        storeAddress: shop_address,
      };
    });

    return res.status(200).json({
      sucess: true,
      message: "Your business cards:",
      data: {
        business_cards: data
      }
    });
  } catch (error) {
    //  Log error to console for maintenace by developers
    console.log({ ...error, errorStack: error.stack });

    //  Send server error response and optional dev if in dev mode
    res.status(500).json({
      success: false,
      message: 'An internal server error occured',
      status: 500,
      error: {
        statusCode: 500,
        message: error.message
      }
    });
  }
};
