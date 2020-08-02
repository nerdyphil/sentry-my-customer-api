const Store = require("../models/store");

const customerService = require("./customerService");
const assistantService = require("./assistantService");

module.exports = {
  getAllStores: async (params) => {
    let stores = await Store.find(params).populate({ path: "store_admin_ref" }).exec();
    stores = await stores.reduce(async (acc, cur) => {
      acc = await acc;
      let customers = await customerService.getCustomers({
        store_ref_id: cur._id,
      });
      let assistants = await assistantService.getAllAssistants({
        store_ref_id: cur._id,
      });
      return [...acc, [{ ...cur.toObject(), customers, assistants }]];
    }, []);
    return stores;
  },
  getOneStore: async (param) => {
    let store = await Store.findOne(param);
    if (!store) return store;
    store = await store.toObject();
    return {
      ...store,
      customers: await customerService.getCustomers({
        store_ref_id: store._id,
      }),
      assistants: await assistantService.getAllAssistants({
        store_ref_id: store._id,
      }),
    };
  },
};
