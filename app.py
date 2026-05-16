# ═══════════════════════════════════════
# LipaMap — app.py
# Entry point — creates the Flask app,
# registers controllers (Blueprints),
# and initialises the database on startup.
#
# Architecture: MVC
#   Models      → models/
#   Views       → index.html, script.js, styles.css
#   Controllers → controllers/
# ═══════════════════════════════════════

import os
from flask import Flask, send_from_directory
from dotenv import load_dotenv

# ─── LOAD ENVIRONMENT VARIABLES ───
load_dotenv()

# ─── CONFIG (DB + Cloudinary) ───
import config  # noqa: F401 — runs cloudinary.config() on import

# ─── MODELS (DB init + seed) ───
from models.location_model import init_locations_table, seed_locations
from models.category_model import init_categories_table, seed_categories

# ─── CONTROLLERS (Blueprints) ───
from controllers.location_controller import location_bp
from controllers.category_controller import category_bp
from controllers.auth_controller     import auth_bp

# ─── CREATE APP ───
app = Flask(__name__)

# Ensure uploads folder exists (local fallback)
os.makedirs('uploads', exist_ok=True)

# ─── REGISTER BLUEPRINTS ───
app.register_blueprint(location_bp)
app.register_blueprint(category_bp)
app.register_blueprint(auth_bp)

# ─── SERVE FRONTEND (Views) ───
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# ─── INITIALISE DATABASE ON STARTUP ───
# Runs for both Gunicorn (Render) and direct `python app.py`
init_locations_table()
init_categories_table()
seed_categories()
seed_locations()
print('✅ LipaMap is ready!')

# ─── DEV SERVER ───
if __name__ == '__main__':
    print('📍 Open your browser: http://127.0.0.1:5000')
    app.run(debug=True)
