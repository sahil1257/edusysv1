// routes/teacher.routes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware'); // <-- IMPORT THE MIDDLEWARE

const {
    getTeachers,
    createTeacher,
    getTeacherById,
    updateTeacher,
    deleteTeacher,
    bulkCreateTeachers,
    bulkDeleteTeachers
} = require('../controllers/teacherController');

router.route('/')
    .get(getTeachers)
    .post(createTeacher);

// --- MODIFIED SECTION ---
// Route for bulk CREATION
router.post('/bulk', bulkCreateTeachers);

// NEW: Add this bulk DELETE route
router.delete('/bulk', bulkDeleteTeachers);
// ------------------------

router.route('/:id')
    .get(getTeacherById)
    .put(upload.single('profileImage'), updateTeacher) // <-- ADD MIDDLEWARE HERE
    .delete(deleteTeacher);

module.exports = router;