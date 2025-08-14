'use strict';

// ======= Configuration =======
const API_BASE = 'http://localhost:3002/api';

let authToken = null;



// ======= State =======
let movies = [];
let isLoggedIn = false;
let currentSection = 'home';
let currentGenreFilter = 'all';

// ======= Utilities =======

function showNotification(message, isError = false) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification show';
  if (isError) notification.classList.add('error');

  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function setSectionActive(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionName).classList.add('active');
  currentSection = sectionName;
  if (sectionName === 'home') displayMovies();
  if (sectionName === 'admin') renderAdminMoviesList();
}

// ======= Auth =======

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    authToken = data.token;
    localStorage.setItem('authToken', authToken);
    isLoggedIn = true;
    document.getElementById('adminBtn').classList.remove('hidden');
    setSectionActive('admin');
    showNotification('Login successful!');
  } catch (e) {
    showNotification('Login failed: ' + (e.message || 'Unknown error'), true);
  }
}

function logout() {
  isLoggedIn = false;
  authToken = null;
  localStorage.removeItem('authToken');
  document.getElementById('adminBtn').classList.add('hidden');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  setSectionActive('home');
  showNotification('Logged out successfully!');
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
    showNotification('Please fill in all fields!', true);
    return;
  }

  if (!isLoggedIn) {
    showNotification('You must be logged in to upload movies.', true);
    return;
  }

  try {
    const form = new FormData();
    form.append('title', title);
    form.append('genre', genre);
    form.append('description', description);
    if (fileInput.files[0]) form.append('video', fileInput.files[0]);

    const res = await fetch(`${API_BASE}/movies`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: form
    });
    if (!res.ok) throw new Error('Upload failed');
    const created = await res.json();
    movies.push(created);
    clearAdminForm();
    showNotification('Movie uploaded successfully!');
    displayMovies();
    renderAdminMoviesList();
  } catch (e) {
    showNotification('Upload failed: ' + (e.message || 'Unknown error'), true);
  }
}

function clearAdminForm() {
  document.getElementById('movieTitle').value = '';
  document.getElementById('movieGenre').value = '';
  document.getElementById('movieDescription').value = '';
  document.getElementById('movieFile').value = '';
  document.getElementById('fileInfo').textContent = '';
}

// ======= Admin Manage (Delete) =======
function renderAdminMoviesList() {
  const container = document.getElementById('adminMoviesList');
  if (!container) return;
  if (!isLoggedIn) {
    container.innerHTML = '<div style="opacity:0.8">Login to manage movies.</div>';
    return;
  }
  if (!movies.length) {
    container.innerHTML = '<div style="opacity:0.8">No movies yet.</div>';
    return;
  }
  container.innerHTML = movies.map(m => `
    <div class="admin-movie-item">
      <div class="meta">
        <strong>${m.title}</strong> · <span>${m.genre}</span>${m.videoUrl ? ' · <span style="color:#4ecdc4">video</span>' : ''}
      </div>
            <button class="btn btn-danger" onclick="deleteMovie('${m.id}')">Delete</button>
    </div>
  `).join('');
}

async function deleteMovie(id) {
  if (!confirm('Are you sure you want to delete this movie?')) return;
  const targetId = id;
  const exists = movies.some(m => m.id === targetId);
  if (!exists) return;

  if (!isLoggedIn || !authToken) {
    showNotification('You must be logged in to delete movies.', true);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/movies/${targetId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Delete failed');
    }

    // On success, update UI
    movies = movies.filter(m => m.id !== targetId);
    displayMovies();
    renderAdminMoviesList();
    showNotification('Movie deleted.');

  } catch (e) {
    showNotification('Server delete failed: ' + (e.message || 'Unknown error'), true);
  }
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
        <source src="${API_BASE.replace('/api', '')}${movie.videoUrl}" type="video/mp4">
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
  // Check for a stored token
  const storedToken = localStorage.getItem('authToken');
  if (storedToken) {
    authToken = storedToken;
    isLoggedIn = true;
    document.getElementById('adminBtn').classList.remove('hidden');
  }
  try {
    const res = await fetch(`${API_BASE}/movies`);
    if (!res.ok) throw new Error('Could not fetch movies');
    movies = await res.json();
  } catch (e) {
    console.error('Initialization failed:', e);
    movies = []; // Start with empty list on error
    showNotification('Could not load movies from the server. Please ensure the backend is running.', true);
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
window.deleteMovie = deleteMovie;

// Start
init();
