// routes/student.routes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware'); // <-- IMPORT THE MIDDLEWARE

const {
    getStudents,
    createStudent,
    getStudentById,
    updateStudent,
    deleteStudent,
    bulkCreateStudents,
    bulkDeleteStudents
} = require('../controllers/studentController');

router.route('/')
    .get(getStudents)
    .post(createStudent);

// --- MODIFIED SECTION ---
// Route for bulk CREATION
router.post('/bulk', bulkCreateStudents);

// NEW: Add this bulk DELETE route
router.delete('/bulk', bulkDeleteStudents);
// ------------------------

router.route('/:id')
    .get(getStudentById)
    .put(upload.single('profileImage'), updateStudent) // <-- ADD THE MIDDLEWARE HERE
    .delete(deleteStudent);

module.exports = router;