// controllers/studentController.js
const asyncHandler = require('express-async-handler');
const Student = require('../models/student.model.js');
const Section = require('../models/section.model.js'); // For bulk create
const User = require('../models/user.model.js');
const sharp = require('sharp');
const { put } = require('@vercel/blob'); // Vercel Blob SDK

const populateStudentDetails = (query) => {
    return query.populate({
        path: 'sectionId',
        select: 'name subjectId',
        populate: {
            path: 'subjectId',
            select: 'name departmentId',
            populate: {
                path: 'departmentId',
                select: 'name'
            }
        }
    });
};

const getStudents = asyncHandler(async (req, res) => {
    const students = await populateStudentDetails(Student.find({}));
    res.json(students);
});

const getStudentById = asyncHandler(async (req, res) => {
    const student = await populateStudentDetails(Student.findById(req.params.id));
    if (student) {
        res.json(student);
    } else {
        res.status(404);
        throw new Error('Student not found');
    }
});

// --- THIS FUNCTION IS NOW UPGRADED ---
const createStudent = asyncHandler(async (req, res) => {
    // 1. Create a new Mongoose document in memory. This assigns a unique _id.
    const student = new Student({
        name: req.body.name,
        email: req.body.email,
        rollNo: req.body.rollNo,
        dateOfBirth: req.body.dateOfBirth,
        sectionId: req.body.sectionId,
        gender: req.body.gender,
        bloodGroup: req.body.bloodGroup,
        guardianName: req.body.guardianName,
        contact: req.body.contact,
        address: req.body.address,
        enrollmentDate: req.body.enrollmentDate || new Date(),
    });

    // 2. Check if a file was uploaded via multer.
    if (req.file) {
        // 3. Use the in-memory _id to create a unique filename.
        const filename = `students/${student._id}-${Date.now()}.webp`;
        
        // 4. Process the image buffer with sharp for optimization.
        const imageBuffer = await sharp(req.file.buffer)
            .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
            .toFormat('webp')
            .webp({ quality: 80 })
            .toBuffer();

        // 5. Upload the processed image to Vercel Blob.
        const blob = await put(filename, imageBuffer, { access: 'public' });
        
        // 6. Assign the returned public URL to the student document.
        student.profileImage = blob.url;
    }
    
    // 7. Save the final document (with or without the image URL) to the database.
    const createdStudent = await student.save();

    // 8. Return the complete, saved student object.
    res.status(201).json(createdStudent);
});

const updateStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (student) {
        Object.assign(student, req.body);

        if (req.file) {
            const filename = `students/${student._id}-${Date.now()}.webp`;
            const imageBuffer = await sharp(req.file.buffer)
                .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
                .toFormat('webp')
                .webp({ quality: 80 })
                .toBuffer();
            const blob = await put(filename, imageBuffer, { access: 'public' });
            student.profileImage = blob.url; // Save the full URL
        }

        const updatedStudent = await student.save();
        const user = await User.findOne({ studentId: student._id });
        if (user) {
            user.name = updatedStudent.name;
            user.email = updatedStudent.email;
            if (student.profileImage) {
                user.profileImage = student.profileImage;
            }
            await user.save();
        }
        res.json(updatedStudent);
    } else {
        res.status(404);
        throw new Error('Student not found');
    }
});

const deleteStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (student) {
        await User.deleteOne({ studentId: student._id });
        await student.deleteOne();
        res.json({ message: 'Student and associated user removed' });
    } else {
        res.status(404);
        throw new Error('Student not found');
    }
});

const bulkCreateStudents = asyncHandler(async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        res.status(400); throw new Error('Student data must be a non-empty array.');
    }
    const allSections = await Section.find({});
    const sectionMap = new Map(allSections.map(section => [section.name, section._id]));
    const successfulInserts = []; const failedRecords = [];
    for (const record of records) {
        try {
            const userExists = await User.findOne({ email: record.email });
            if (userExists) { throw new Error(`User with email ${record.email} already exists.`); }
            const sectionId = sectionMap.get(record.sectionName);
            if (record.sectionName && !sectionId) { throw new Error(`Section with name "${record.sectionName}" was not found.`); }
            const student = new Student({ name: record.name, email: record.email, rollNo: record.rollNo, sectionId: sectionId, dateOfBirth: record.dateOfBirth, gender: record.gender, contact: record.contact, address: record.address, guardianName: record.guardianName, profileImage: record.profileImage, enrollmentDate: record.enrollmentDate, bloodGroup: record.bloodGroup, });
            const createdStudent = await student.save();
            await User.create({ name: createdStudent.name, email: createdStudent.email, password: record.password, role: 'Student', studentId: createdStudent._id, });
            successfulInserts.push(createdStudent);
        } catch (error) {
            failedRecords.push({ record, error: error.message });
        }
    }
    res.status(207).json({ success: true, message: 'Bulk student import process finished.', insertedCount: successfulInserts.length, failedCount: failedRecords.length, failures: failedRecords, });
});

const bulkDeleteStudents = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400); throw new Error('An array of student IDs is required.');
    }
    await User.deleteMany({ studentId: { $in: ids } });
    const result = await Student.deleteMany({ _id: { $in: ids } });
    if (result.deletedCount === 0) {
        res.status(404); throw new Error('No matching students found to delete.');
    }
    res.status(200).json({ success: true, message: `Successfully deleted ${result.deletedCount} students and their associated user accounts.` });
});

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkCreateStudents,
    bulkDeleteStudents
};