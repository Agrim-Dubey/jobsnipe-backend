# JobSnipe 🎯

Mass job crawler that scrapes the web based on your preferences. No AWS, no Kafka, no complex infra. Just Python and a stunning frontend.

## Features
- **Mass Crawling**: Scrapes Hacker News, Reddit, RemoteOK, Arbeitnow, and major ATS platforms (Lever, Greenhouse, Workable) via Google Discovery.
- **Modern UI**: Polished dark-themed SPA built with Vite and Vanilla JS.
- **Smart Filtering**: Filter jobs by source, status (seen/saved), and search keywords.
- **Preferences**: Set your desired roles, locations, and skills to target your job search.
- **Local Storage**: All jobs are stored in a local PostgreSQL database.

## Tech Stack
- **Backend**: FastAPI (Python 3.12+), SQLAlchemy, PostgreSQL
- **Scraping**: HTTPX, BeautifulSoup4
- **Frontend**: Vite, Vanilla JavaScript, CSS3
- **Database**: PostgreSQL (via Docker)

## Getting Started

### 1. Requirements
- Docker & Docker Compose
- Python 3.12+
- Node.js (for frontend development)

### 2. Setup
1. Copy `.env.example` to `.env` and configure your database URL.
2. Start the database:
   ```bash
   docker compose up -d database
   ```
3. Install backend dependencies:
   ```bash
   pip install -r fastapi_app/requirements.txt
   ```
4. Run migrations:
   ```bash
   alembic upgrade head
   ```
5. Start the backend:
   ```bash
   uvicorn fastapi_app.main:app --reload
   ```
6. Start the frontend:
   ```bash
   cd frontend && npm install && npm run dev
   ```

## License
MIT
