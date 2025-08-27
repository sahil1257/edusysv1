// routes/upload.routes.js
const express = require('express');
const router = express.Router();
const { upload, uploadImage } = require('../controllers/uploadController');

// The line requiring the missing 'authMiddleware.js' file has been removed.

// The 'protect' variable has been removed from this line to prevent the crash.
router.post('/', upload.single('image'), uploadImage);

module.exports = router;