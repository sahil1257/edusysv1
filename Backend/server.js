const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs'); // Import the file system module

// Load environment variables
dotenv.config();

// Connect to the database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json({ limit: '50mb' })); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // To parse URL-encoded bodies

// --- IMPORTANT: ADDED CODE FOR DIRECTORY CREATION ---
// Use a temporary, writable directory for uploads, as '/var/task' is read-only.
const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created the writable "uploads" directory inside /tmp.');
}
// --- END OF ADDED CODE ---

app.get('/', (req, res) => {
  res.status(200).json({ message: 'EduSys Pro API is online and running.Thanks For visiting......' });
});

// Configure Express to serve files from the new temporary uploads directory
app.use('/uploads', express.static(uploadDir));

// --- API ROUTES ---
app.use('/', require('./routes/auth.routes'));
app.use('/users', require('./routes/user.routes'));
app.use('/students', require('./routes/student.routes'));
app.use('/teachers', require('./routes/teacher.routes'));
app.use('/staffs', require('./routes/staff.routes'));
app.use('/subjects', require('./routes/subject.routes'));
app.use('/sections', require('./routes/section.routes'));
app.use('/departments', require('./routes/department.routes'));
app.use('/timetable', require('./routes/timetable.routes'));
app.use('/notices', require('./routes/notice.routes'));
app.use('/financial', require('./routes/financial.routes'));
app.use('/exams', require('./routes/exam.routes'));
app.use('/results', require('./routes/result.routes'));
app.use('/attendance', require('./routes/attendance.routes'));
app.use('/library', require('./routes/library.routes'));
app.use('/transport', require('./routes/transport.routes'));

// --- Error Handling Middleware ---
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4051;

app.listen(PORT, () =>
  console.log(`Server is running successfully on http://localhost:${PORT}`)
);
