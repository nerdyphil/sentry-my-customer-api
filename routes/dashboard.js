const router = require("express").Router();
const auth = require("../auth/auth");
const dashboard = require("../controllers/dashboardController");

router.get("/dashboard", auth, dashboard.storeAdminDashboard);
router.get("/dashboard/all", auth, dashboard.superAdminDashboard);
router.get("/dashboard/assistant", auth, dashboard.storeAssistantDashboard);
router.get("/dashboard/customer", auth, dashboard.customerDashboard);

module.exports = router;
