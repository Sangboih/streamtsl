# CineFree

A simple movie streaming demo with a vanilla JS frontend and an Express backend.

## What I changed
- Extracted inline CSS and JS into `styles.css` and `script.js`.
- Added starter seed movies so the grid shows content immediately.
- Added localStorage persistence (`cinefree_movies`) so movies survive refreshes when not using the backend.
- Added optional backend (`server.js`) with endpoints for health, login, list movies, and upload movie (stored under `/uploads`).
- Updated frontend to auto-detect the backend and use it if available; otherwise it gracefully falls back to local mode.
- Added Safari support for `backdrop-filter` via `-webkit-backdrop-filter`.

## Project structure
```
movie_streaming_site/
├─ movie_streaming_site (1).html   # Frontend HTML
├─ styles.css                      # Frontend styles
├─ script.js                       # Frontend logic (seed, localStorage, API)
├─ server.js                       # Express backend (optional)
├─ package.json                    # Backend dependencies & scripts
└─ uploads/                        # Created at runtime for uploaded files
```

## Requirements
- Node.js 18+ (for backend only). The frontend runs by just opening the HTML file.

## Run the frontend only (no backend)
- Double-click `movie_streaming_site (1).html` to open in your browser.
- The app will use seed movies and persist to `localStorage`.

## Run the backend (optional)
1) Open a terminal in the `movie_streaming_site` folder and install deps:
```
npm install
```
2) Start the server:
```
npm start
```
- Server will run at `http://localhost:3000`.
- API endpoints:
  - `GET  /api/health`
  - `POST /api/login`            body: `{ username, password }` → `{ token }`
  - `GET  /api/movies`           → `[ { id, title, genre, description, videoUrl } ]`
  - `POST /api/movies` (multipart/form-data with optional `video` file). Requires `Authorization: Bearer <token>`

## Frontend behavior with backend
- On load, frontend checks `GET /api/health`.
- If backend is up:
  - Login uses `/api/login`.
  - Movies are fetched from `/api/movies`.
  - Uploads are posted to `/api/movies` (video saved in `/uploads`, URL like `/uploads/<file>`).
- If backend is down:
  - Uses seed + `localStorage` only.

## Default admin credentials
- username: `admin`
- password: `msbmsb325TSL`

## Notes
- This is a demo and not production-ready (no real auth, no validations, no database).
- CORS is enabled broadly to allow opening the HTML file directly (file://) while the backend runs at localhost.
