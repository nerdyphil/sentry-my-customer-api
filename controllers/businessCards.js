const Store = require("../models/store");
const UserModel = require("../models/store_admin");
const { errorHandler } = require("./login_controler");

module.exports = () => async (req, res) => {
  try {
    //  Enable business card feature for only store admin
    let store;
    if (req.user.user_role === "super_admin") {
      store = await Store.find({}).populate({ path: "store_admin_ref" }).exec();
    } else if (req.user.user_role === "store_admin") {
      store = await Store.find({ store_admin_ref: req.user._id })
        .populate({ path: "store_admin_ref" })
        .exec();
    } else {
      return res.status(403).json({
        message: "You can't access this resource",
        success: false,
        errorCode: {
          statusCode: 403,
        },
      });
    }

    //  Get all stores owned by user
    userStores = store;

    //  Iterate through stores and create cards
    const data = userStores.map((store) => {
      const { store_name, phone_number, email, shop_address } = store;
      if (!store.store_admin_ref) {
        store.store_admin_ref = {
          local: {
            first_name: "",
            last_name: "",
            phone_number: "",
          },
        };
      }
      return {
        ownerName: `${store.store_admin_ref.local.first_name} ${store.store_admin_ref.local.last_name}`,
        storeName: store_name,
        email: email || store.store_admin_ref.local.email,
        phone: phone_number || store.store_admin_ref.local.phone_number,
        storeAddress: shop_address,
      };
    });

    return res.status(200).json({
      sucess: true,
      message: "Your business cards:",
      data: {
        business_cards: data,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
