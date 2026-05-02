# ═══════════════════════════════════════
# LipaMap — config.py
# Centralised configuration: DB + Cloudinary
# ═══════════════════════════════════════

import os
import psycopg2
import cloudinary
import cloudinary.uploader

# ─── DATABASE ───
DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://neondb_owner:npg_x4YH6SOkKnoG@ep-purple-credit-a11kchlw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
)

def get_db():
    """Open and return a new database connection."""
    return psycopg2.connect(DATABASE_URL)

# ─── CLOUDINARY ───
cloudinary.config(
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME', 'decldyhjb'),
    api_key    = os.environ.get('CLOUDINARY_API_KEY',    '226428839186441'),
    api_secret = os.environ.get('CLOUDINARY_API_SECRET', 'hTbuZ0m87tnLepyLgoMI0OIfjHc')
)
