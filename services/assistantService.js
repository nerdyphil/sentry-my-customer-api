const StoreAssistantModel = require("../models/storeAssistant");

module.exports = {
  getAllAssistants: (params) => {
    return StoreAssistantModel.find(params).select("-password").exec();
  },
};
