# ═══════════════════════════════════════
# LipaMap — config.py
# Centralised configuration: DB + Cloudinary
# ═══════════════════════════════════════

import os
import psycopg2
import cloudinary
import cloudinary.uploader

# ─── DATABASE ───
# Always use the environment variable, no fallback with old credentials
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError('DATABASE_URL environment variable is not set. Check your .env file.')

def get_db():
    """Open and return a new database connection."""
    return psycopg2.connect(DATABASE_URL)

# ─── CLOUDINARY ───
# Always use environment variables, no hardcoded fallbacks
cloudinary.config(
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key    = os.environ.get('CLOUDINARY_API_KEY'),
    api_secret = os.environ.get('CLOUDINARY_API_SECRET')
)
