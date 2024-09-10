const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadDir));

// Connect to the database
async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Error connecting to the database', error);
    process.exit(1); 
  }
}

connectToDatabase();

// Define the storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files to the uploads directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Timestamp filenames for uniqueness
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error);
    }
    cb(null, true);
  }
});

// Routes

app.get('/', (req, res) => {
  res.send('Welcome to online storage API');
});

// Upload file endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { originalname, mimetype, filename, size } = req.file;

    // Save file metadata to the database
    const file = await prisma.file.create({
      data: {
        originalName: originalname,
        mimeType: mimetype,
        fileName: filename,
        size,
        filePath: path.join('uploads', filename)
      }
    });

    res.status(201).json({ message: 'File uploaded successfully', file });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get all uploaded files
app.get('/files', async (req, res) => {
  try {
    const files = await prisma.file.findMany();
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
