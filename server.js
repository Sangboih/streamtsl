// Simple Express backend for CineFree
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const config = require('./config');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3002;

// Storage for uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const time = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${time}_${safe}`);
  }
});
const upload = multer({ storage });

// Database setup (lowdb)
const adapter = new FileSync('movies.json');
const db = low(adapter);

// Set some defaults if the file is empty
db.defaults({ movies: [] }).write();

// CORS: allow requests from any origin (including file:// which appears as null)
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Static serving of uploads
app.use('/uploads', express.static(uploadsDir));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Very simple auth (DO NOT use in production)
const ADMIN = { username: config.ADMIN_USERNAME, password: config.ADMIN_PASSWORD };
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN.username && password === ADMIN.password) {
    // Return a fake token (not a real JWT)
    return res.json({ token: 'dev-token' });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

// Get movies
app.get('/api/movies', (req, res) => {
  const movies = db.get('movies').value();
  res.json(movies);
});

// Create movie (with optional video upload)
app.post('/api/movies', 
  upload.single('video'),
  [
    body('title').not().isEmpty().trim().escape().withMessage('Title is required'),
    body('genre').not().isEmpty().trim().escape().withMessage('Genre is required'),
    body('description').not().isEmpty().trim().escape().withMessage('Description is required'),
  ],
  (req, res) => {
    // Very naive Authorization check
    const auth = req.headers.authorization || '';
    if (auth !== 'Bearer dev-token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, genre, description } = req.body;
    const id = crypto.randomUUID();
    const movie = {
      id,
      title,
      genre,
      description,
      videoUrl: req.file ? `/uploads/${req.file.filename}` : null
    };
    db.get('movies').push(movie).write();
    res.status(201).json(movie);
  }
);

// Delete movie
app.delete('/api/movies/:id', (req, res) => {
  // Very naive Authorization check
  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer dev-token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = req.params.id;
  const [removed] = db.get('movies').remove({ id }).write();

  if (!removed) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Attempt to delete associated uploaded file if it exists
  try {
    if (removed && removed.videoUrl) {
      const filename = path.basename(removed.videoUrl);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (e) {
    console.warn('Failed to remove video file:', e);
  }

  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`CineFree backend running on http://localhost:${PORT}`);
});
