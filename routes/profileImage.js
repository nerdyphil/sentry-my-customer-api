const router = require("express").Router();
const auth = require("../auth/auth");
const profileimageController = require("../controllers/profileImageController");
const imageParser = profileimageController.imageParser();

router.put("/update-image", auth, imageParser.single("image"), profileimageController.updateImage);

module.exports = router;