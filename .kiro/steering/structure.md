# LipaMap — Project Structure

## File Layout

```
/
├── app.py                          # Flask app — routes, DB init, delegates to controllers
├── controllers/
│   ├── auth_controller.py          # Admin password verification (reCAPTCHA removed)
│   ├── category_controller.py      # Category CRUD operations
│   └── location_controller.py      # Location CRUD operations
├── models/
│   ├── category_model.py           # Category database operations
│   └── location_model.py           # Location database operations
├── index.html                      # Single-page app shell — all UI markup
├── script.js                       # All frontend logic (map, admin, panels, search)
├── styles.css                      # Full design system — tokens, layout, components, responsive
├── requirements.txt                # Python dependencies
├── Procfile                        # Gunicorn entry point for deployment
├── .env                            # Local secrets (gitignored)
├── .gitignore
├── uploads/                        # Local image upload fallback (gitignored in prod)
├── lipa-barangays.geojson          # Barangay boundaries for choropleth heatmap
├── lipa-boundary.geojson           # City boundary polygon
├── LipaCityLogo.png                # Watermark asset
└── ComParkLipa.png                 # Seeded location image
```

## Architecture Pattern

This is a **monolithic single-page app** with no frontend build tooling:

- Flask serves `index.html` and all static files directly from the project root
- The frontend communicates with the backend exclusively via `fetch()` calls to `/api/*` endpoints
- No templating engine — HTML is fully static; data is injected via JavaScript DOM manipulation
- No frontend framework or module bundler — all JS is in one file, ES5-compatible

## Backend Structure

The backend follows an **MVC-inspired architecture** with separation between controllers (route handlers) and models (database operations):

### `app.py`
- Entry point: initializes Flask app, registers blueprints, serves static files
- `get_db()` — opens a new psycopg2 connection per request (no connection pooling)
- `init_db()` — creates `locations` and `categories` tables if they don't exist; called at startup
- Static files served via catch-all `/<path:filename>` route

### `controllers/`
- **`auth_controller.py`** — handles `POST /api/verify-password` for admin authentication (password-only, reCAPTCHA was removed)
- **`category_controller.py`** — handles `GET/POST /api/categories` and `DELETE /api/categories/<id>`
- **`location_controller.py`** — handles `GET/POST /api/locations` and `DELETE /api/locations/<id>`

### `models/`
- **`category_model.py`** — database operations for categories (CRUD)
- **`location_model.py`** — database operations for locations (CRUD)

Routes follow REST conventions:
- `POST /api/verify-password` — admin password authentication
- `GET/POST /api/locations` — list all / add new location
- `DELETE /api/locations/<id>` — remove a location
- `GET/POST /api/categories` — list all / add new category
- `DELETE /api/categories/<id>` — remove category and cascade-delete its locations

## Frontend Structure (`script.js`)

Organized into numbered sections (comments mark each):
1. Admin system (login, logout, mode toggle)
2. Toast notifications
3. Mobile drawer
4. Map initialization (Leaflet, bounds)
5. Tile layers (street / satellite)
6. City boundary polygon (permanent layer, never removed by heatmap toggle)
7. Layer groups (one `L.layerGroup` per category)
8. Counters
9. Icons & colors (`COLORS`, `LABELS`, `makeIcon()`)
10. **CHOROPLETH HEATMAP BY BARANGAY** — uses dedicated `choroPane` (z-index 350) for proper layering beneath markers and city boundary; includes `pendingChoroBuild` flag to queue builds if `lipa-barangays.geojson` hasn't loaded yet; `toggleHeatmap()` must never touch the city boundary or barangay outline layers; `buildChoropleth()` must filter geoJSON to Polygon/MultiPolygon features only via `filter` and use `pointToLayer` to return invisible circle markers for any stray Points (the source geoJSON contains 57 Point features alongside 30 polygon barangay boundaries, and Leaflet's default Point handling triggers an `iconUrl not set in Icon options` crash that breaks the toggle)
11. `addMarker()` — core function to place a marker on the map
12. Seeded location data (hardcoded `addMarker()` calls)
13. Add Place panel
14. Detail panel
15. Layer filters (`soloLayer`, `chipFilter`, `showAll`)
16. Settings panel
17. Bottom tabs
18. Search
19. About & Contact modals
20. Finalize (boundary z-index)
21. `loadLocationsFromDB()` — fetches DB locations on page load
22. Category manager

## CSS Design System (`styles.css`)

- CSS custom properties (design tokens) defined in `:root` — colors, spacing, typography, animation
- Color palette: mint/pine greens (`--mint-*`, `--pine-*`), neutral sand/ink (`--sand-*`, `--ink-*`)
- Glassmorphism aesthetic: `backdrop-filter: blur()` + semi-transparent backgrounds throughout
- Responsive breakpoints: `≤1024px` (tablet), `≤768px` (phone), `≤400px` (small phone)
- Admin-only elements use `.admin-only` class (hidden by default, shown via `.visible` when logged in)

## Database Schema

**`locations`** — `id, name, category, description, latitude, longitude, image_path, info (JSON string), address`

**`categories`** — `id, name, label, emoji, color, group_type`

## Key Conventions

- New categories must be added to both the DB (`/api/categories`) and the frontend `COLORS`/`LABELS` maps in `script.js` to render correctly
- `info` field is stored as a JSON string in the DB and parsed with `JSON.parse()` on the frontend
- Coordinates are validated client-side to stay within Lipa City bounds before submission
- Images are uploaded to Cloudinary; `image_path` stores the full Cloudinary HTTPS URL
- Admin password is verified server-side via `POST /api/verify-password`; the `ADMIN_PASSWORD` env var holds the value
