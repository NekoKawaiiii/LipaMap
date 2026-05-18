# LipaMap — Tech Stack

## Backend
- **Python / Flask** — web server and REST API (`app.py`)
- **psycopg2** — PostgreSQL driver
- **PostgreSQL (Neon)** — cloud-hosted database (connection string via `DATABASE_URL` env var)
- **Cloudinary** — image upload and hosting (credentials via env vars)
- **Gunicorn** — WSGI production server (defined in `Procfile`)

## Frontend
- **Vanilla JavaScript** (ES5-compatible, no build step) — `script.js`
- **HTML5** — `index.html` (single-page app shell)
- **CSS3** — `styles.css` (custom design system, no CSS framework)
- **Leaflet.js 1.9.4** — interactive map (loaded via CDN)
- **Leaflet.heat 0.2.0** — heatmap plugin (loaded via CDN)
- **Google Fonts** — Outfit + Playfair Display (loaded via CDN)

## External Services
- **OpenStreetMap** — default street tile layer
- **Esri World Imagery** — satellite tile layer
- **Neon** — serverless PostgreSQL hosting
- **Cloudinary** — image storage and delivery

## Environment Variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `ADMIN_USERNAME` | Admin login username (required, no default — the `/api/verify-login` route fails closed if unset) |
| `ADMIN_PASSWORD` | Admin login password (defaults to `'admin123'` if unset — set this in production) |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v2 secret key for verifying the login page captcha (required, no default — the `/api/verify-login` route fails closed if unset) |

Store these in `.env` (gitignored). Never commit secrets.

## Common Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py
# → http://127.0.0.1:5000

# Run production server (as Heroku/Render would)
gunicorn app:app
```

## Deployment
- `Procfile` targets Gunicorn: `web: gunicorn app:app`
- Compatible with Heroku, Render, Railway, and similar PaaS platforms
- No build/compile step required — static files are served directly by Flask
