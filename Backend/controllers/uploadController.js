// controllers/uploadController.js
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const asyncHandler = require('express-async-handler');
const fs = require('fs');

// --- Configuration ---
// Ensure the /uploads directory exists, creating it if it doesn't. This prevents errors on startup.
const uploadDirectory = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// 1. Multer Setup (The Receptionist)
// We use memoryStorage to handle the image in memory, which is faster and more secure.
const multerStorage = multer.memoryStorage();

// We only allow files that have an 'image' mimetype.
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Please upload an image.'), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: { fileSize: 15 * 1024 * 1024 }, // Set a 15MB file size limit
});

// This is the middleware that will be used in our route.
// It tells Multer to expect a single file from a form field named 'profileImage'.
exports.uploadMiddleware = upload.single('profileImage');

// 2. Sharp Logic (The Photo Processor)
exports.uploadProfileImage = asyncHandler(async (req, res) => {
    // Multer adds the 'file' object to the request if an upload is successful.
    if (!req.file) {
        res.status(400);
        throw new Error('Please upload an image file.');
    }

    // Create a unique, secure filename. We use the user's ID and a timestamp.
    const userId = req.body.userId || 'user'; // We'll send this from the frontend.
    const filename = `profile-${userId}-${Date.now()}.jpeg`;
    const outputPath = path.join(uploadDirectory, filename);

    // Process the image buffer from memory with Sharp.
    await sharp(req.file.buffer)
        .resize(500, 500, { fit: 'cover' }) // Resize and crop to a 500x500 square.
        .toFormat('jpeg')                   // Convert to JPEG format.
        .jpeg({ quality: 90 })              // Set JPEG quality to 90%.
        .toFile(outputPath);                // Save the final image to our /uploads folder.

    // Send back the public URL of the newly created image.
    const imageUrl = `/uploads/${filename}`;

    res.status(200).json({
        success: true,
        message: 'Image processed and saved successfully.',
        imageUrl: imageUrl, // This is the "claim ticket" URL.
    });
});