// in middleware/uploadMiddleware.js

const multer = require('multer');
const path = require('path');

// Configure storage options for Multer
// ANALYSIS: We now use memoryStorage. The file is held in a buffer in memory,
// allowing for fast processing with 'sharp' before being uploaded to the cloud.
// No files are written to the local disk, which is essential for serverless environments.
const storage = multer.memoryStorage(); // Store the file in memory temporarily

// Create a file filter to accept only image files
const fileFilter = (req, file, cb) => {
    // Allowed extensions
    const filetypes = /jpeg|jpg|png|gif|webp|heic|heif/; // Added HEIC/HEIF
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = file.mimetype.startsWith('image/');

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only!'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 10 } // Increased limit to 10MB for larger source images
});

module.exports = upload;
