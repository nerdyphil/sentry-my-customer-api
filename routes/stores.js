const express = require("express");
const router = express.Router();
const storeController = require("./../controllers/stores");
const auth = require("../auth/auth");

router.post("/store/new", auth, storeController.createStore);
router.get("/store", auth, storeController.getAllStores);
router.get("/store/all", auth, storeController.getAll);
router.get("/store/:store_id", auth, storeController.getStore);
router.put("/store/update/:store_id", auth, storeController.updateStore);
router.delete("/store/delete/:store_id", auth, storeController.deleteStore);

module.exports = router;
