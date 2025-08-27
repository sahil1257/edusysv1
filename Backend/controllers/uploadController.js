// controllers/uploadController.js
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// --- Multer Configuration ---
// This sets up a temporary storage location for incoming files.
const tempStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempPath = path.join(__dirname, '../uploads/temp');
        fs.mkdirSync(tempPath, { recursive: true }); // Ensure the directory exists
        cb(null, tempPath);
    },
    filename: (req, file, cb) => {
        // Use a unique name to avoid conflicts
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: tempStorage });

// --- Controller Function ---
// This function will receive the uploaded file, convert it, and save it.
const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No image file uploaded.');
    }

    const tempPath = req.file.path;
    const outputFilename = `${Date.now()}.jpeg`;
    const outputPath = path.join(__dirname, '../uploads/images', outputFilename);

    // Ensure the final destination directory exists
    fs.mkdirSync(path.join(__dirname, '../uploads/images'), { recursive: true });

    try {
        // --- The Magic of Sharp ---
        // It reads the uploaded file (any format), resizes it, converts to JPEG,
        // compresses it, and saves it to the final destination.
        await sharp(tempPath)
            .resize({ width: 800, height: 800, fit: 'inside' }) // Resize to a max of 800x800
            .toFormat('jpeg', { quality: 85 }) // Convert to JPEG with 85% quality
            .toFile(outputPath);

        // --- Cleanup ---
        // Delete the original temporary file
        fs.unlinkSync(tempPath);

        // --- Success ---
        // Return the publicly accessible URL of the NEWLY CREATED image
        // IMPORTANT: You might need to adjust this URL based on how you serve static files.
        const imageUrl = `/uploads/images/${outputFilename}`; 
        res.status(201).json({ success: true, imageUrl });

    } catch (error) {
        // If something goes wrong, make sure to clean up the temp file
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        console.error('Image processing error:', error);
        res.status(500);
        throw new Error('Error processing the image.');
    }
});

module.exports = {
    upload, // Export the multer middleware
    uploadImage
};