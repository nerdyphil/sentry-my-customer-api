
    const express = require('express');
    const router = express.Router();
    const users = require('../controllers/user.controller.js');
    const bodyValidator = require('../util/body_validator')
    const auth = require("../auth/auth");

    const multer  = require('multer');
    const storage = multer.memoryStorage();
    const uploads = multer({ storage }).single('image');
    const cloudConfig = require('../controllers/cloudinaryController').cloudConfig
    router.use("/assistant", auth)
    //Add new user
    router.post("/assistant/new", auth, users.validate('body'), bodyValidator, users.new);
   // Retrieve all Users
   router.get('/assistant', auth, users.all);

    // Retrieve a single User with user_id
    router.get('/assistant/:assistant_id', auth, users.getById);

   // Update User Info with user_id
   router.put('/assistant/update/:assistant_id', auth, users.update);

    // Delete a User with user_id
    router.delete('/assistant/delete/:user_id', auth, users.delete);

    // Update User Info with user_id
    router.put('/store-admin/update', auth, users.validate('store_admin'), bodyValidator, users.updateStoreAdmin);

    router.post('/store_admin/reset-password/', users.reset);

    router.post('/store_admin/forgot-password', users.forgot);

    router.post('/store_admin/forgot-password/:token', users.tokenreset)
    router.patch('/store-admin/picture/update', uploads, auth, cloudConfig, users.updatePicture);

    module.exports = router;
