const express = require("express");
const router = express.Router();
const bodyValidator = require("../util/body_validator");
const debt = require("./../controllers/debt_reminder.js");
const auth = require("../auth/auth");

// router.post(
//   "/debt/new",
//   auth,
//   debt.validate("body"),
//   bodyValidator,
//   debt.create
// );
// router.delete("/debt/delete/:transactionId", auth, debt.deleteById);

//all debt
router.get("/debt", auth, debt.getAll);

router.get("/debt/:storeId", auth, debt.getStoreDebt);

router.put("/debt/update/:transactionId", auth, debt.markAsPaid);

// router.get("/debt/assistant", auth, debt.assistantView);

//single debt
router.get("/debt/single/:transactionId", auth, debt.getById);

//send reminder  body: { transaction_id, message(optional)}
router.post("/debt/send", auth, debt.send);

//schedule reminder body:{ transaction_id, message(optional), scheduleDate, time }
router.post("/debt/schedule", auth, debt.schedule);

module.exports = router;
