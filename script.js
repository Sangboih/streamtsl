'use strict';

// ======= Configuration =======
const API_BASE = 'http://localhost:3000/api';
let backendAvailable = false;
let authToken = null;

// ======= Seed Movies =======
const seedMovies = [
  { id: 1, title: 'Fast & Furious', genre: 'Action', description: 'High-octane action with cars and adrenaline.', videoUrl: null },
  { id: 2, title: 'The Hangover', genre: 'Comedy', description: 'A hilarious comedy about a wild night in Vegas.', videoUrl: null },
  { id: 3, title: 'The Godfather', genre: 'Drama', description: 'A classic drama about family and power.', videoUrl: null },
  { id: 4, title: 'Halloween', genre: 'Horror', description: 'A terrifying horror movie that will keep you on edge.', videoUrl: null },
  { id: 5, title: 'Die Hard', genre: 'Action', description: 'An explosive action thriller in a skyscraper.', videoUrl: null },
  { id: 6, title: 'Superbad', genre: 'Comedy', description: 'A coming-of-age comedy about friendship.', videoUrl: null },
];

// ======= State =======
let movies = [];
let isLoggedIn = false;
let currentSection = 'home';
let currentGenreFilter = 'all';

// ======= Utilities =======
function saveMoviesToLocal() {
  try { localStorage.setItem('cinefree_movies', JSON.stringify(movies)); } catch {}
}

function loadMoviesFromLocal() {
  try {
    const raw = localStorage.getItem('cinefree_movies');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

async function checkBackend() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    backendAvailable = res.ok;
  } catch {
    backendAvailable = false;
  }
}

function setSectionActive(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionName).classList.add('active');
  currentSection = sectionName;
  if (sectionName === 'home') displayMovies();
}

// ======= Auth =======
const fallbackAdmin = { username: 'admin', password: 'msbmsb325TSL' };

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (backendAvailable) {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      authToken = data.token;
      isLoggedIn = true;
      document.getElementById('adminBtn').style.display = 'inline-block';
      setSectionActive('admin');
      alert('Login successful!');
      return;
    } catch (e) {
      alert('Login failed: ' + (e.message || 'Unknown error'));
      return;
    }
  }

  // Fallback client-side auth
  if (username === fallbackAdmin.username && password === fallbackAdmin.password) {
    isLoggedIn = true;
    document.getElementById('adminBtn').style.display = 'inline-block';
    setSectionActive('admin');
    alert('Login successful!');
  } else {
    alert('Invalid credentials! Try: admin / msbmsb325TSL');
  }
}

function logout() {
  isLoggedIn = false;
  authToken = null;
  document.getElementById('adminBtn').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  setSectionActive('home');
  alert('Logged out successfully!');
}

// ======= Upload =======
function handleFileSelect(input) {
  const file = input.files[0];
  if (file) {
    document.getElementById('fileInfo').textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  }
}

async function uploadMovie() {
  const title = document.getElementById('movieTitle').value.trim();
  const genre = document.getElementById('movieGenre').value;
  const description = document.getElementById('movieDescription').value.trim();
  const fileInput = document.getElementById('movieFile');

  if (!title || !genre || !description) {
    alert('Please fill in all fields!');
    return;
  }

  // Try backend first
  if (backendAvailable && isLoggedIn) {
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('genre', genre);
      form.append('description', description);
      if (fileInput.files[0]) form.append('video', fileInput.files[0]);

      const res = await fetch(`${API_BASE}/movies`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: form
      });
      if (!res.ok) throw new Error('Upload failed');
      const created = await res.json();
      movies.push(created);
      saveMoviesToLocal();
      clearAdminForm();
      alert('Movie uploaded successfully!');
      displayMovies();
      return;
    } catch (e) {
      console.warn('Backend upload failed, falling back to local:', e);
    }
  }

  // Fallback local add
  const newMovie = {
    id: movies.length ? Math.max(...movies.map(m => m.id)) + 1 : 1,
    title, genre, description,
    videoUrl: fileInput.files[0] ? URL.createObjectURL(fileInput.files[0]) : null,
  };
  movies.push(newMovie);
  saveMoviesToLocal();
  clearAdminForm();
  alert('Movie uploaded successfully (local only)!');
  displayMovies();
}

function clearAdminForm() {
  document.getElementById('movieTitle').value = '';
  document.getElementById('movieGenre').value = '';
  document.getElementById('movieDescription').value = '';
  document.getElementById('movieFile').value = '';
  document.getElementById('fileInfo').textContent = '';
}

// ======= Movies List / Filters =======
function filterMovies(genre) {
  currentGenreFilter = genre;
  document.querySelectorAll('.genre-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-genre="${genre}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  displayMovies();
}

function displayMovies() {
  const grid = document.getElementById('moviesGrid');
  grid.innerHTML = '';
  const filteredMovies = currentGenreFilter === 'all' ? movies : movies.filter(m => m.genre === currentGenreFilter);

  if (!filteredMovies.length) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: rgba(255,255,255,0.6);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🎬</div>
        <div>No ${currentGenreFilter === 'all' ? '' : currentGenreFilter} movies available yet</div>
      </div>
    `;
    return;
  }

  filteredMovies.forEach(movie => {
    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card';
    movieCard.onclick = () => playMovie(movie);
    movieCard.innerHTML = `
      <div class="movie-poster">🎬</div>
      <div class="movie-info">
        <div class="movie-title">${movie.title}</div>
        <div class="movie-genre">${movie.genre}</div>
      </div>
    `;
    grid.appendChild(movieCard);
  });
}

function playMovie(movie) {
  document.getElementById('currentMovieTitle').textContent = movie.title;
  document.getElementById('currentMovieGenre').textContent = movie.genre;
  document.getElementById('currentMovieDescription').textContent = movie.description;

  const videoContainer = document.getElementById('videoContainer');
  if (movie.videoUrl) {
    videoContainer.innerHTML = `
      <video controls style="width: 100%; height: 100%;">
        <source src="${movie.videoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `;
  } else {
    videoContainer.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">🎬</div>
        <div>Video preview not available</div>
        <div style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">Upload a video file in admin panel to play</div>
      </div>
    `;
  }

  setSectionActive('player');
}

// Smoothly jump to the genres and highlight them
function startWatching() {
  // Ensure we are on Home
  if (currentSection !== 'home') setSectionActive('home');
  // Find genre filters and scroll into view
  const filters = document.querySelector('.genre-filters');
  if (filters) {
    filters.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Pulse highlight
    filters.classList.add('pulse-highlight');
    setTimeout(() => filters.classList.remove('pulse-highlight'), 1500);
  }
}

// ======= Initialization =======
async function init() {
  await checkBackend();

  const local = loadMoviesFromLocal();
  if (backendAvailable) {
    try {
      const res = await fetch(`${API_BASE}/movies`);
      if (res.ok) {
        movies = await res.json();
        // If server has no movies and local has some, seed server later (not doing auto-seed here)
      } else {
        movies = local || seedMovies.slice();
      }
    } catch {
      movies = local || seedMovies.slice();
    }
  } else {
    // No backend: use local or seed
    movies = local || seedMovies.slice();
  }

  displayMovies();
}

// Expose required globals for inline handlers in HTML
window.showSection = setSectionActive;
window.login = login;
window.logout = logout;
window.handleFileSelect = handleFileSelect;
window.uploadMovie = uploadMovie;
window.filterMovies = filterMovies;
window.playMovie = playMovie;
window.startWatching = startWatching;

// Start
init();
