// Simple Express backend for CineFree
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Movies persistence (very simple JSON file)
const dataFile = path.join(__dirname, 'movies.json');
let movies = [];

function loadMovies() {
  try {
    if (fs.existsSync(dataFile)) {
      const data = fs.readFileSync(dataFile, 'utf-8');
      movies = JSON.parse(data);
    } else {
      fs.writeFileSync(dataFile, JSON.stringify([]));
      movies = [];
    }
  } catch (e) {
    console.error('Could not load or create movies.json, starting with empty list.');
    movies = [];
  }
}

function saveMovies() {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(movies, null, 2));
  } catch (e) {
    console.error('Could not save movies.json:', e);
  }
}

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
  res.json(movies);
});

// Create movie (with optional video upload)
app.post('/api/movies', upload.single('video'), (req, res) => {
  // Very naive Authorization check
  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer dev-token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, genre, description } = req.body;
  if (!title || !genre || !description) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const id = crypto.randomUUID();
  const movie = {
    id,
    title,
    genre,
    description,
    videoUrl: req.file ? `/uploads/${req.file.filename}` : null
  };
  movies.push(movie);
  saveMovies();
  res.status(201).json(movie);
});

// Delete movie
app.delete('/api/movies/:id', (req, res) => {
  // Very naive Authorization check
  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer dev-token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = req.params.id;
  const idx = movies.findIndex(m => m.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Not found' });
  }

  const [removed] = movies.splice(idx, 1);
  saveMovies();

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

loadMovies();

app.listen(PORT, () => {
  console.log(`CineFree backend running on http://localhost:${PORT}`);
});
