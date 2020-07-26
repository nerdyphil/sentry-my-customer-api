const express = require("express");
const router = express.Router();
const storeController = require("./../controllers/stores");
const auth = require("../auth/auth");

router.post("/store/new", auth, storeController.createStore);
router.get("/store", auth, storeController.getAllStores);
router.get("/store/all", auth, storeController.getAllStores);
router.put("/store/update/:store_id", auth, storeController.updateStore);
router.delete("/store/delete/:store_id", auth, storeController.deleteStore);
router.get("/store/:store_id", auth, storeController.getStore);

module.exports = router;
