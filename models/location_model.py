# ═══════════════════════════════════════
# LipaMap — models/location_model.py
# Model: all database operations for locations
# ═══════════════════════════════════════

import json
from config import get_db

# ─── SEED DATA ───
SEED_LOCATIONS = [
    {
        'name': 'Lipa City Park',
        'category': 'park',
        'description': "The main public recreation park at the heart of Lipa City. Features open lawns, walking paths, children's playground, and a small amphitheater used for community events.",
        'latitude': 13.9415, 'longitude': 121.1637,
        'image_path': '/ComParkLipa.png',
        'info': json.dumps({'Operating Hours': '5:00 AM – 9:00 PM', 'Area': '3.2 hectares', 'Managed by': 'City Parks & Recreation Office', 'Facilities': 'Benches, Playground, Covered Stage', 'Last Updated': 'December 2025'}),
        'address': 'Poblacion, Lipa City, Batangas'
    },
    {
        'name': 'Lipa Riverside Park',
        'category': 'park',
        'description': 'A linear park running along the riverbank, ideal for jogging and early morning walks. Features native tree plantings and riverside viewing areas.',
        'latitude': 13.9400, 'longitude': 121.1600,
        'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Riverside_park.jpg/640px-Riverside_park.jpg',
        'info': json.dumps({'Operating Hours': 'Open 24 hours', 'Area': '1.8 hectares', 'Trail Length': '1.2 km', 'Managed by': 'City Environment Office', 'Last Updated': 'November 2025'}),
        'address': 'Poblacion, Lipa City, Batangas'
    },
    {
        'name': 'Mt. Malarayat Forest Reserve',
        'category': 'forest',
        'description': 'A major forested mountain area serving as the primary green lung of Lipa City. Home to endemic bird species and supports watershed protection for eastern barangays.',
        'latitude': 13.9490, 'longitude': 121.1720,
        'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Forest_path.jpg/640px-Forest_path.jpg',
        'info': json.dumps({'Classification': 'Protected Forest Reserve', 'Area': '420 hectares', 'Elevation': '600–1,150 MASL', 'Key Species': 'Narra, Molave, Philippine Eagle Owl', 'Managed by': 'DENR Region IV-A', 'Last Updated': 'October 2025'}),
        'address': 'Brgy. Mataas na Lupa, Lipa City, Batangas'
    },
    {
        'name': 'Community Garden – Brgy. San Jose',
        'category': 'garden',
        'description': "A community-led urban garden producing fresh vegetables for local households. Established under the city's Urban Agriculture Program. Open to volunteer participation on weekends.",
        'latitude': 13.9350, 'longitude': 121.1500,
        'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Vegetable_garden.jpg/640px-Vegetable_garden.jpg',
        'info': json.dumps({'Produce': 'Kangkong, Sitaw, Talong, Ampalaya', 'Plots Available': '24 plots', 'Area': '0.5 hectares', 'Program': 'Urban Agriculture Program', 'Contact': 'Brgy. San Jose Hall', 'Last Updated': 'December 2025'}),
        'address': 'Brgy. San Jose, Lipa City, Batangas'
    },
    {
        'name': 'Wetland Reserve – Brgy. Lodlod',
        'category': 'wetland',
        'description': 'A natural wetland providing critical habitat for migratory waterbirds and serving as a natural flood buffer for downstream communities. Currently under habitat restoration.',
        'latitude': 13.9200, 'longitude': 121.1750,
        'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Marshland.jpg/640px-Marshland.jpg',
        'info': json.dumps({'Classification': 'Natural Wetland', 'Area': '12 hectares', 'Bird Species': '30+ recorded species', 'Status': 'Under Restoration', 'Managed by': 'DENR & City ENRO', 'Last Updated': 'September 2025'}),
        'address': 'Brgy. Lodlod, Lipa City, Batangas'
    },
    {
        'name': 'Recycling Center – City Proper',
        'category': 'recycle',
        'description': 'The primary city-operated materials recovery facility (MRF). Accepts plastic, paper, metal, and glass. Drop-off open to all residents.',
        'latitude': 13.9300, 'longitude': 121.1800,
        'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Recycling_bins.jpg/640px-Recycling_bins.jpg',
        'info': json.dumps({'Accepts': 'Plastic, Paper, Metal, Glass', 'Capacity': '5 tons/day', 'Operating Hours': 'Mon–Sat, 7:00 AM – 5:00 PM', 'Managed by': 'City Environment Office', 'Contact': '(043) 123-4567', 'Last Updated': 'December 2025'}),
        'address': 'Poblacion, Lipa City, Batangas'
    },
    {
        'name': 'Composting Site – Brgy. Anilao',
        'category': 'compost',
        'description': 'A barangay-level composting facility processing organic kitchen and garden waste. Finished compost is distributed free to community gardens and urban farmers.',
        'latitude': 13.9550, 'longitude': 121.1600,
        'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Compost.jpg/640px-Compost.jpg',
        'info': json.dumps({'Input Material': 'Kitchen & Garden Waste', 'Output': 'Organic compost (free to residents)', 'Capacity': '800 kg/week', 'Operating Hours': 'Mon, Wed, Fri — 8:00 AM – 12:00 PM', 'Managed by': 'Brgy. Anilao Council', 'Last Updated': 'November 2025'}),
        'address': 'Brgy. Anilao, Lipa City, Batangas'
    },
    {
        'name': 'Waste Collection Point – Brgy. Marawoy',
        'category': 'collection',
        'description': 'Designated barangay waste collection point serving residential zones in Marawoy. Segregated bins for biodegradable, residual, and recyclable waste.',
        'latitude': 13.9380, 'longitude': 121.1680,
        'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Garbage_collection.jpg/640px-Garbage_collection.jpg',
        'info': json.dumps({'Collection Schedule': 'Mon, Wed, Fri', 'Collection Time': '6:00 AM – 10:00 AM', 'Bins Available': 'Biodegradable, Recyclable, Residual', 'Serves': 'Approx. 450 households', 'Managed by': 'Brgy. Marawoy & City Sanitation', 'Last Updated': 'December 2025'}),
        'address': 'Brgy. Marawoy, Lipa City, Batangas'
    },
]


def get_all_locations():
    """Return all locations from the database."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM locations')
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            'id':          row[0],
            'name':        row[1],
            'category':    row[2],
            'description': row[3],
            'latitude':    row[4],
            'longitude':   row[5],
            'image_path':  row[6],
            'info':        row[7],
            'address':     row[8] if len(row) > 8 else ''
        }
        for row in rows
    ]


def create_location(name, category, description, latitude, longitude, image_path, info, address):
    """Insert a new location and return its id."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO locations
            (name, category, description, latitude, longitude, image_path, info, address)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    ''', (name, category, description, latitude, longitude, image_path, info, address))
    new_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return new_id


def update_location(location_id, name, description, image_path=None):
    """Update name, description, and optionally image_path. Returns current image_path."""
    conn = get_db()
    cursor = conn.cursor()
    if image_path:
        cursor.execute('''
            UPDATE locations SET name = %s, description = %s, image_path = %s
            WHERE id = %s
        ''', (name, description, image_path, location_id))
    else:
        cursor.execute('''
            UPDATE locations SET name = %s, description = %s
            WHERE id = %s
        ''', (name, description, location_id))
    conn.commit()

    # Fetch the current image_path to return to the controller
    if not image_path:
        cursor.execute('SELECT image_path FROM locations WHERE id = %s', (location_id,))
        row = cursor.fetchone()
        image_path = row[0] if row else ''

    cursor.close()
    conn.close()
    return image_path or ''


def delete_location(location_id):
    """Delete a location by id."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM locations WHERE id = %s', (location_id,))
    conn.commit()
    cursor.close()
    conn.close()


def init_locations_table():
    """Create the locations table if it does not exist."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS locations (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL,
            category    TEXT NOT NULL,
            description TEXT,
            latitude    REAL NOT NULL,
            longitude   REAL NOT NULL,
            image_path  TEXT,
            info        TEXT,
            address     TEXT,
            UNIQUE (name, latitude, longitude)
        )
    ''')
    # Add unique constraint to existing table if it doesn't have one yet
    cursor.execute('''
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'locations_name_latitude_longitude_key'
            ) THEN
                ALTER TABLE locations
                ADD CONSTRAINT locations_name_latitude_longitude_key
                UNIQUE (name, latitude, longitude);
            END IF;
        END $$;
    ''')
    conn.commit()
    cursor.close()
    conn.close()


def seed_locations():
    """Insert default locations; skip any that already exist (safe to run multiple times)."""
    conn = get_db()
    cursor = conn.cursor()
    inserted = 0
    for loc in SEED_LOCATIONS:
        cursor.execute('''
            INSERT INTO locations
                (name, category, description, latitude, longitude, image_path, info, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name, latitude, longitude) DO NOTHING
        ''', (loc['name'], loc['category'], loc['description'],
              loc['latitude'], loc['longitude'],
              loc['image_path'], loc['info'], loc['address']))
        if cursor.rowcount:
            inserted += 1
    conn.commit()
    cursor.close()
    conn.close()
    if inserted:
        print(f'🌱 Seeded {inserted} default location(s).')
    else:
        print('🌱 Seed locations already present, skipping.')


def normalize_existing_categories():
    """Fix existing locations with non-canonical category keys."""
    from models.category_model import normalize_category_key
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT category FROM locations')
    rows = cursor.fetchall()
    updated_total = 0
    for row in rows:
        raw = row[0]
        canonical = normalize_category_key(raw)
        if canonical != raw:
            cursor.execute(
                'UPDATE locations SET category = %s WHERE category = %s',
                (canonical, raw)
            )
            updated_total += cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    if updated_total:
        print(f'🔄 Normalized {updated_total} location category value(s).')
    else:
        print('🔄 All location categories already canonical.')


# ─── LOCATION IMAGES TABLE ───

def init_location_images_table():
    """Create the location_images table if it does not exist."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS location_images (
            id            SERIAL PRIMARY KEY,
            location_id   INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
            image_url     TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            UNIQUE (location_id, image_url)
        )
    ''')
    conn.commit()
    cursor.close()
    conn.close()


def get_images_for_location(location_id):
    """Return list of image dicts for a location, ordered by display_order."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, image_url, display_order FROM location_images WHERE location_id = %s ORDER BY display_order',
        (location_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {'id': row[0], 'image_url': row[1], 'display_order': row[2]}
        for row in rows
    ]


def add_location_image(location_id, image_url, display_order):
    """Insert a new image row for a location."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO location_images (location_id, image_url, display_order) VALUES (%s, %s, %s)',
        (location_id, image_url, display_order)
    )
    conn.commit()
    cursor.close()
    conn.close()


def delete_location_image(image_id):
    """Remove an image row by its id."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM location_images WHERE id = %s', (image_id,))
    conn.commit()
    cursor.close()
    conn.close()


def backfill_location_images():
    """Migrate existing locations with image_path into location_images table."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, image_path FROM locations WHERE image_path IS NOT NULL AND image_path != ''")
    rows = cursor.fetchall()
    backfilled = 0
    for row in rows:
        location_id = row[0]
        image_url = row[1]
        cursor.execute(
            '''INSERT INTO location_images (location_id, image_url, display_order)
               VALUES (%s, %s, 0)
               ON CONFLICT (location_id, image_url) DO NOTHING''',
            (location_id, image_url)
        )
        if cursor.rowcount:
            backfilled += 1
    conn.commit()
    cursor.close()
    conn.close()
    if backfilled:
        print(f'🖼️ Backfilled {backfilled} image(s) into location_images.')
    else:
        print('🖼️ No new images to backfill.')
