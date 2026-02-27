# Lead Extractor

A self-hosted multi-user web service for extracting leads from Google Maps. Find local businesses without websites — perfect for web design, SEO, and marketing agencies looking for new clients.

## Features

- **Dual Pricing Model** — Use your own Google Places API key for free, or purchase managed plans via Stripe
- **Stripe Payments** — Secure checkout with dynamic MXN/USD currency based on user location
- **Multi-user Auth** — Register via email/password or passwordless magic links
- **Internationalization** — Full i18n support (English, Spanish, French)
- **Lead Scoring** — Businesses scored by rating, reviews, photos, and profile completeness
- **Export Results** — Download as CSV or JSON
- **Self-hosted** — Full control over your data

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│  Google Places  │
│   (Astro)       │     │   (FastAPI)     │     │      API        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │    │
                              ▼    ▼
                        ┌──────┐ ┌──────┐
                        │SQLite│ │Stripe│
                        └──────┘ └──────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Google Maps API key (Places API enabled)
- Stripe account (for managed plans)

### Local Development

1. **Clone and setup**

```bash
# Install frontend dependencies
cd web && npm install

# Install backend dependencies
cd ../api_server && pip install -r requirements.txt
```

2. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your settings (see Environment Variables below)
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

## Stripe Setup

Lead Extractor uses **Stripe Checkout** with inline pricing (no pre-created products needed).

### 1. Get Your API Keys

- Go to the [Stripe Dashboard](https://dashboard.stripe.com/) > **Developers** > **API Keys**
- Copy the **Secret Key** (`sk_test_...` for testing, `sk_live_...` for production)
- Add it to your `.env` as `STRIPE_SECRET_KEY`

### 2. Configure Webhooks

Webhooks are how Stripe notifies your server that a payment succeeded.

**For Production:**
1. Go to **Developers** > **Webhooks** > **Add endpoint**
2. Set the URL to `https://your-api-domain.com/api/payments/webhook`
3. Select event: `checkout.session.completed`
4. Copy the **Signing Secret** (`whsec_...`) to your `.env` as `STRIPE_WEBHOOK_SECRET`

**For Local Testing:**
1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli)
2. Run: `stripe listen --forward-to localhost:8000/api/payments/webhook`
3. Copy the CLI-provided `whsec_...` secret to your `.env`
4. Use test card `4242 4242 4242 4242` with any future expiry and CVC

### Pricing Tiers

| Tier | USD | MXN | Description |
|------|-----|-----|-------------|
| Single Job | $4 | $75 | 1 lead extraction credit |
| Weekly | $10 | $200 | Unlimited access for 7 days |
| Monthly | $20 | $400 | Unlimited access for 30 days |

Currency is automatically determined by the user's IP address (Mexico → MXN, everywhere else → USD).

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email (magic link) |
| POST | `/api/auth/register/password` | Register with email + password |
| POST | `/api/auth/login` | Request magic link |
| POST | `/api/auth/login/password` | Login with email + password |
| GET | `/api/auth/verify` | Verify magic link token |
| GET | `/api/auth/me` | Get current user profile |

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Create new job (requires credits or subscription) |
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

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/checkout` | Create Stripe Checkout session |
| POST | `/api/payments/webhook` | Stripe webhook (automated) |

## Project Structure

```
lead-extractor/
├── api_server/
│   ├── main.py              # FastAPI app, auth endpoints
│   ├── database.py          # SQLite models and queries
│   ├── auth.py              # JWT, magic links, password auth
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routes/
│   │   ├── jobs.py          # Job CRUD + subscription enforcement
│   │   ├── results.py       # Result retrieval and export
│   │   ├── keys.py          # Google API key management
│   │   ├── categories.py    # Business category endpoints
│   │   └── payments.py      # Stripe checkout + webhook
│   └── services/
│       └── extractor.py     # Google Places extraction engine
├── web/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── index.astro        # Landing page
│   │   │   ├── pricing.astro      # Public pricing page
│   │   │   ├── checkout.astro     # Plan selection + Stripe redirect
│   │   │   ├── dashboard.astro    # User dashboard
│   │   │   ├── login.astro        # Login page
│   │   │   ├── register.astro     # Registration page
│   │   │   ├── settings.astro     # User settings
│   │   │   ├── payment/
│   │   │   │   └── success.astro  # Post-payment confirmation
│   │   │   ├── auth/
│   │   │   │   └── verify.astro   # Magic link verification
│   │   │   └── jobs/
│   │   │       ├── [id].astro     # Job detail view
│   │   │       └── new.astro      # New job form
│   │   ├── components/
│   │   │   ├── DashboardContent.tsx
│   │   │   ├── AuthForm.tsx
│   │   │   ├── JobForm.tsx
│   │   │   ├── Navigation.tsx
│   │   │   ├── LanguageSwitcher.tsx
│   │   │   └── landing/
│   │   │       ├── Header.astro
│   │   │       └── Footer.astro
│   │   ├── layouts/
│   │   │   └── Layout.astro       # Global layout + auth guard
│   │   ├── middleware.ts          # Server-side route protection
│   │   └── lib/
│   │       ├── api.ts             # API client functions
│   │       ├── i18n.ts            # i18next configuration
│   │       └── locales/
│   │           ├── en.json
│   │           ├── es.json
│   │           └── fr.json
│   ├── public/
│   │   └── locales/               # Static locale files for SSR
│   ├── astro.config.mjs
│   ├── tailwind.config.mjs
│   └── package.json
├── lib/                           # Shared extraction utilities
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
| `SMTP_HOST` | SMTP server for emails | — |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASSWORD` | SMTP password | — |
| `FROM_EMAIL` | Sender email address | `noreply@leadextractor.app` |
| `PUBLIC_API_URL` | API URL for frontend | `http://localhost:8000` |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_` or `sk_live_`) | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_`) | — |
| `FRONTEND_URL` | Frontend URL for Stripe redirects | `http://localhost:4321` |

## Getting a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Places API**
4. Create credentials (API key)
5. Add the key in the app settings

## Tech Stack

- **Backend**: FastAPI, SQLite, Python 3.9+
- **Frontend**: Astro 5, React 18, Tailwind CSS
- **Auth**: JWT, magic links, bcrypt passwords
- **Payments**: Stripe Checkout (inline pricing)
- **i18n**: i18next (EN, ES, FR)
- **Deployment**: Docker, nginx

## License

MIT
