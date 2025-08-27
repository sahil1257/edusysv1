// routes/upload.routes.js
const express = require('express');
const { uploadProfileImage, uploadMiddleware } = require('../controllers/uploadController');
const router = express.Router();

// Route: POST /api/upload/profile
// It first runs the 'uploadMiddleware' to receive the file.
// If successful, it then runs 'uploadProfileImage' to process and save it.
router.post('/profile', uploadMiddleware, uploadProfileImage);

module.exports = router;

// Respond with the image URL.
    res.status(200).json({ imageUrl });