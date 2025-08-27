// controllers/uploadController.js
const multer = require('multer');
const sharp = require('sharp');
const asyncHandler = require('express-async-handler');
const { put } = require('@vercel/blob'); // Import the 'put' function from Vercel Blob

// 1. Multer Setup (remains the same)
// It will still receive the file and hold it in memory.
const multerStorage = multer.memoryStorage();
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
    limits: { fileSize: 15 * 1024 * 1024 },
});

// Middleware to be used in the route
exports.uploadMiddleware = upload.single('profileImage');

// 2. The NEW Upload Logic
exports.uploadProfileImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('Please upload an image file.');
    }

    // Generate a unique filename for the blob store
    const userId = req.body.userId || 'user';
    const filename = `profiles/${userId}-${Date.now()}.jpeg`;

    // Process the image with Sharp IN MEMORY, but don't save to a file yet.
    // Instead, we get the processed image back as a Buffer.
    const processedImageBuffer = await sharp(req.file.buffer)
        .resize(500, 500, { fit: 'cover' })
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer(); // Output the result as a buffer, not a file

    // Upload the processed image buffer to Vercel Blob
    const blob = await put(filename, processedImageBuffer, {
        access: 'public', // Make the image publicly accessible
    });

    // Vercel Blob returns a result object which contains the permanent, public URL.
    // This is the URL we will save to our database.
    const imageUrl = blob.url;

    res.status(200).json({
        success: true,
        message: 'Image successfully uploaded to Vercel Blob.',
        imageUrl: imageUrl, // Send the permanent URL back to the frontend
    });
});