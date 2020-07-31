const express = require("express");
const router = express.Router();
const users = require("../controllers/user.controller.js");
const bodyValidator = require("../util/body_validator");
const auth = require("../auth/auth");
router.use("/assistant", auth);

// retrieve all users - this is a super admin privilege
router.get("/users/all", auth, users.getAllStoreAdmin);

//Add new StoreAdmin
router.post(
  "/store_admin/new",
  auth,
  users.validate("body"),
  bodyValidator,
  users.newStoreAdmin
);

//Add new StoreAssistant
router.post(
  "/assistant/new",
  auth,
  users.validate("body"),
  bodyValidator,
  users.newStoreAssistant
);

// Retrieve all StoreAssistant
router.get("/assistant", auth, users.allStoreAssistant);

//Retrieve a single User with user_id
router.get("/assistant/:assistant_id", auth, users.getSingleStoreAssistant);

// Update User Info with user_id
router.put(
  "/assistant/update/:assistant_id",
  auth,
  users.updateSingleStoreAssistant
);

// Delete a User with user_id
router.delete(
  "/assistant/delete/:assistant_id",
  auth,
  users.deleteSingleStoreAssistant
);

// Update User Info with user_id
router.put("/store-admin/update", auth, users.updateStoreAdmin);

// Update Bank Info with user_id
router.put("/bank-details", auth, users.updateBankDetails);

router.post(
  "/store-admin/update/password",
  auth,
  users.validate("password"),
  bodyValidator,
  users.updatePassword
);

router.post("/store_admin/forgot-password", users.forgot);

router.post("/store_admin/forgot-password/:token", users.tokenreset);
router.patch(
  "/store-admin/deactivate/:phone_number",
  auth,
  users.deactivateUser
);
router.patch("/store-admin/activate/:phone_number", auth, users.activateUser);
router.get("/store_admin/:id", auth, users.getSingleStoreAdmin);

module.exports = router;
