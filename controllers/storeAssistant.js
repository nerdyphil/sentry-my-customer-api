const StoreAssistantModel = require("../models/storeAssistant");
const UserModel = require("../models/store_admin");

exports.createStoreAssistant = (req, res, next) => {
  const { phone_number, name, store_id } = req.body;
  const id = req.user.phone_number;

  if (!phone_number || !name || !store_id) {
    return res.status(400).json({
      success: false,
      message: "Enter the required details",
      data: {
        status: 400,
        message: "Enter the required details",
      },
    });
  }

  const newStoreAssistantData = {
    name,
    phone_number,
    store_id,
  };

  UserModel.findOne({ identifier: id })
    .then((user) => {
      user.assistants.push(newStoreAssistantData);

      user
        .save()
        .then((result) => {
          res.status(200).json({
            StoreData: result,
          });
        })
        .catch((err) => res.send(err));
    })
    .catch((error) => {
      res.status(500).json({
        Error: error,
      });
    });
};
