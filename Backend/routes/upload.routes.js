// routes/upload.routes.js
const express = require('express');
const router = express.Router();
const { upload, uploadImage } = require('../controllers/uploadController');

// This defines the endpoint: POST /api/upload
// The 'upload.single('image')' part is multer middleware that looks for a file in a field named 'image'.
router.post('/', protect, upload.single('image'), uploadImage);

module.exports = router;