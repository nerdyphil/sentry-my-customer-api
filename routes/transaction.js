const express = require("express");
const router = express.Router();
const transactions = require("../controllers/transaction.controller.js");
const bodyValidator = require("../util/body_validator");
const auth = require("../auth/auth");

// Create a new Transaction
router.post(
  "/transaction/new",
  auth,
  transactions.validate("create"),
  bodyValidator,
  transactions.create
);

// Retrieve all Transactions
router.get("/transaction/store/:store_id", auth, transactions.findAllStore);
router.get("/transaction/store_admin", auth, transactions.findAllStore);
router.get("/transaction/all", auth, transactions.findAllAdmin);

// Retrieve a single Transaction with transaction_id
router.get(
  "/transaction/:transaction_id/:store_id/:customer_id",
  auth,
  transactions.findOne
);
router.get(
  "/transaction/:transaction_id",
  transactions.findOneTransaction
);

router.get("/transaction/:store_id/:customer_id", auth, transactions.findAll);

// Update a Transaction with transaction_id
router.patch(
  "/transaction/update/:transaction_id",
  auth,
  transactions.validate("update"),
  bodyValidator,
  transactions.update
);

// Delete a Transaction with transaction_id
router.delete(
  "/transaction/delete/:transaction_id/:store_id/:customer_id",
  auth,
  transactions.delete
);

module.exports = router;
