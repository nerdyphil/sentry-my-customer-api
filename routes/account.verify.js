const router = require("express").Router();
const auth = require("../auth/auth");
const verify = require("../controllers/account.verify.js");

router.get("/banks/list", auth,verify.list);
router.post("/account/verify", auth,verify.resolve);

module.exports = router;
