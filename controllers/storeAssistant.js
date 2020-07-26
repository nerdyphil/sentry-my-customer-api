const StoreAssistantModel = require("../models/storeAssistant");
const StoreModel = require("../models/store");
const UserModel = require("../models/store_admin");
const bCrypt = require("bcryptjs");
const { errorHandler } = require("./login_controler");

exports.assistantService = {
  getAllAssistants: (params) => {
    return StoreAssistantModel.find(params).select("-password").exec();
  },
};
