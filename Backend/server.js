const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');

// Initialize Express and Prisma
const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(cors());

// Welcome route
app.get('/', (req, res) => {
    res.send('Welcome to online storage API');
});

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory where files will be stored
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique filename with timestamp
  }
});

const upload = multer({ storage });

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  const { filename } = req.file;
  const filePath = `/uploads/${filename}`;

  try {
    // Save file info to the database
    const file = await prisma.file.create({
      data: { name: filename, path: filePath },
    });

    // Return the saved file info as JSON
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Endpoint to get all uploaded files
app.get('/files', async (req, res) => {
  try {
    // Retrieve all files from the database
    const files = await prisma.file.findMany();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// Start the server and check database connection
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    try {
        await prisma.$connect();
        console.log('Connected to the database');
    } catch (error) {
        console.error('Failed to connect to the database', error);
    }

    console.log(`Server is running on ${PORT}`);
});
