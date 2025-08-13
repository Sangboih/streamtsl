// Simple Express backend for CineFree
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

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
function readMovies() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function writeMovies(list) {
  fs.writeFileSync(dataFile, JSON.stringify(list, null, 2));
}

// CORS: allow requests from any origin (including file:// which appears as null)
app.use(cors({ origin: true }));
app.use(express.json());

// Static serving of uploads
app.use('/uploads', express.static(uploadsDir));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Very simple auth (DO NOT use in production)
const ADMIN = { username: 'admin', password: 'msbmsb325TSL' };
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
  res.json(readMovies());
});

// Create movie (with optional video upload)
app.post('/api/movies', upload.single('video'), (req, res) => {
  // Very naive Authorization check
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const movies = readMovies();
  const { title, genre, description } = req.body;
  if (!title || !genre || !description) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const id = movies.length ? Math.max(...movies.map(m => m.id)) + 1 : 1;
  const movie = {
    id,
    title,
    genre,
    description,
    videoUrl: req.file ? `/uploads/${req.file.filename}` : null
  };
  movies.push(movie);
  writeMovies(movies);
  res.status(201).json(movie);
});

app.listen(PORT, () => {
  console.log(`CineFree backend running on http://localhost:${PORT}`);
});
