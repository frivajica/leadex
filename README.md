# Lead Extractor

A self-hosted multi-user web service for extracting leads from Google Maps. Find local businesses without websites - perfect for web design, SEO, and marketing agencies looking for new clients.

## Features

- **Multi-user support** - Register with just your email (no password)
- **Your own API key** - Use your own Google Maps API key
- **Lead scoring** - Businesses scored by rating, reviews, photos, and profile completeness
- **Export results** - Download as CSV or JSON
- **Self-hosted** - Full control over your data

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│  Google Places  │
│   (Astro)       │     │   (FastAPI)     │     │      API        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   SQLite        │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Google Maps API key (Places API enabled)

### Local Development

1. **Clone and setup**

```bash
# Install frontend dependencies
cd web && npm install

# Install backend dependencies (using uv)
cd ../api_server && uv pip install -r requirements.txt
```

2. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start the servers**

```bash
# Terminal 1: API (port 8000)
cd lead-extractor
PYTHONPATH=. .venv/bin/python -m uvicorn api_server.main:app --reload

# Terminal 2: Frontend (port 4321)
cd web && npm run dev
```

4. **Open browser**

- Frontend: http://localhost:4321
- API docs: http://localhost:8000/docs

### Docker Deployment

```bash
# Build and run
docker-compose up --build

# Or run in background
docker-compose up -d
```

Services will be available at:
- Web: http://localhost:4321
- API: http://localhost:8000

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email |
| POST | `/api/auth/login` | Request magic link |
| GET | `/api/auth/verify` | Verify magic link |
| GET | `/api/auth/me` | Get current user |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create new job |
| GET | `/api/jobs` | List user jobs |
| GET | `/api/jobs/{id}` | Get job details |
| DELETE | `/api/jobs/{id}` | Delete job |
| POST | `/api/jobs/{id}/cancel` | Cancel running job |
| POST | `/api/jobs/{id}/restart` | Restart failed job |

### Results

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs/{id}/results` | Get job results |
| GET | `/api/jobs/{id}/results/export` | Export as CSV/JSON |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/keys` | List API keys |
| POST | `/api/keys` | Add new API key |
| DELETE | `/api/keys/{id}` | Delete API key |

## Project Structure

```
lead-extractor/
├── api_server/
│   ├── main.py
│   ├── database.py
│   ├── auth.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routes/
│   │   ├── jobs.py
│   │   ├── results.py
│   │   └── keys.py
│   └── services/
│       └── extractor.py
├── web/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── layouts/
│   │   └── lib/
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── lib/
│   ├── __init__.py
│   ├── config.py
│   ├── google_places.py
│   ├── filters.py
│   └── exporter.py
├── docker-compose.yml
├── .env.example
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT secret key | Auto-generated |
| `DATABASE_URL` | SQLite path | `sqlite:///./data/leads.db` |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:4321` |
| `APP_URL` | App URL for magic links | `http://localhost:4321` |
| `SMTP_*` | Email settings | Optional |
| `PUBLIC_API_URL` | API URL for frontend | `http://localhost:8000` |

## Getting a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Places API**
4. Create credentials (API key)
5. Add the key in the app settings

## Tech Stack

- **Backend**: FastAPI, SQLite, Python 3.9+
- **Frontend**: Astro 5, React 18, Tailwind CSS
- **Auth**: JWT, magic links (no passwords)
- **Deployment**: Docker, nginx

## License

MIT
