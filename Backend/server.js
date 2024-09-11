require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

// Encryption and decryption functions
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

function encryptFile(buffer) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decryptFile(encrypted) {
  const iv = Buffer.from(encrypted.iv, 'hex');
  const encryptedText = Buffer.from(encrypted.encryptedData, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted;
}

// Routes

app.get('/', (req, res) => {
  res.send('Welcome to online storage API');
});

// Upload file endpoint with tagging
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { originalname, mimetype, filename, size } = req.file;
    const { tags } = req.body; // Expecting tags as a comma-separated string
    const fileBuffer = fs.readFileSync(req.file.path);
    const encryptedFile = encryptFile(fileBuffer);

    // Save encrypted file
    fs.writeFileSync(req.file.path, encryptedFile.encryptedData);

    // Process tags
    const tagList = tags ? tags.split(',').map(tag => tag.trim()) : [];
    const tagRecords = await Promise.all(tagList.map(async (tag) => {
      return await prisma.tag.upsert({
        where: { name: tag },
        update: {},
        create: { name: tag }
      });
    }));

    // Save file metadata to the database
    const file = await prisma.file.create({
      data: {
        originalName: originalname,
        mimeType: mimetype,
        fileName: filename,
        size,
        filePath: path.join('uploads', filename),
        iv: encryptedFile.iv,
        tags: {
          connect: tagRecords.map(tag => ({ id: tag.id }))
        }
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

// Download file endpoint
app.get('/uploads/:filename', async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { fileName: req.params.filename }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const encryptedData = fs.readFileSync(path.join(__dirname, file.filePath));
    const decryptedData = decryptFile({ iv: file.iv, encryptedData: encryptedData.toString() });

    res.setHeader('Content-Type', file.mimeType);
    res.send(decryptedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Search files endpoint
app.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    console.log(`Search query: ${query}`); // Log the search query
    const files = await prisma.file.findMany({
      where: {
        OR: [
          { originalName: { contains: query, mode: 'insensitive' } },
          { tags: { some: { name: { contains: query, mode: 'insensitive' } } } }
        ]
      },
      include: { tags: true }
    });
    res.json(files);
  } catch (error) {
    console.error('Error during search:', error); // Log the error
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
  // Log the DATABASE_URL to verify it's loaded
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);
});