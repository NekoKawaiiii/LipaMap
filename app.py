# ═══════════════════════════════════════
# LipaMap — app.py
# Python/Flask backend server
# Now using PostgreSQL (Neon) instead of SQLite
# ═══════════════════════════════════════

from flask import Flask, request, jsonify, send_from_directory
import psycopg2
import os
import cloudinary
import cloudinary.uploader

# Configure Cloudinary
cloudinary.config(
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME', 'decldyhjb'),
    api_key    = os.environ.get('CLOUDINARY_API_KEY', '226428839186441'),
    api_secret = os.environ.get('CLOUDINARY_API_SECRET', 'hTbuZ0m87tnLepyLgoMI0OIfjHc')
)

# Create the Flask app
app = Flask(__name__)

# Folder where uploaded images will be saved
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── YOUR NEON DATABASE CONNECTION STRING ───
# Paste your Neon connection string here!

import os
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://neondb_owner:npg_x4YH6SOkKnoG@ep-purple-credit-a11kchlw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')

# ─── CONNECT TO DATABASE ───
def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

# ─── DATABASE SETUP ───
# Creates the table if it doesn't exist yet
def init_db():
    conn = get_db()
    cursor = conn.cursor()
   # Locations table
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
            address     TEXT
        )
    ''')

    # Categories table — stores custom categories added by admin
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id      SERIAL PRIMARY KEY,
            name    TEXT NOT NULL,
            label   TEXT NOT NULL,
            emoji   TEXT NOT NULL,
            color   TEXT NOT NULL
        )
    ''')

    conn.commit()
    cursor.close()
    conn.close()
    print('✅ Database tables ready!')

# ─── SERVE YOUR WEBSITE FILES ───
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# ─── GET ALL LOCATIONS ───
@app.route('/api/locations', methods=['GET'])
def get_locations():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM locations')
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    locations = []
    for row in rows:
        locations.append({
            'id':          row[0],
            'name':        row[1],
            'category':    row[2],
            'description': row[3],
            'latitude':    row[4],
            'longitude':   row[5],
            'image_path':  row[6],
            'info':        row[7],
            'address':     row[8] if len(row) > 8 else ''
        })

    return jsonify(locations)

# ─── ADD A NEW LOCATION ───
@app.route('/api/locations', methods=['POST'])
def add_location():
    try:
        name        = request.form.get('name')
        category    = request.form.get('category')
        description = request.form.get('description')
        latitude    = request.form.get('latitude')
        longitude   = request.form.get('longitude')
        info        = request.form.get('info')
        address     = request.form.get('address')

        # Handle image upload via Cloudinary
        image_path = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename != '':
                # Upload to Cloudinary instead of local folder
                upload_result = cloudinary.uploader.upload(
                    image,
                    folder='lipamap',
                    resource_type='image'
                )
                # Save the Cloudinary URL instead of local path
                image_path = upload_result['secure_url']

        # Save to database
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO locations 
            (name, category, description, latitude, longitude, image_path, info, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (name, category, description, latitude, longitude, image_path, info, address))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Location added successfully!', 'image_path': image_path or ''}), 200

    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500

# ─── VERIFY RECAPTCHA + PASSWORD ───
@app.route('/api/verify-captcha', methods=['POST'])
def verify_captcha():
    import urllib.request
    import urllib.parse
    import json as _json

    data       = request.get_json()
    token      = data.get('token', '')
    password   = data.get('password', '')
    secret_key = os.environ.get('RECAPTCHA_SECRET_KEY', '6LcfhdMsAAAAAIZnQugz8pOoGXzJoIgf2jmjx8SJ')

    # Verify token with Google
    params  = urllib.parse.urlencode({'secret': secret_key, 'response': token}).encode()
    req     = urllib.request.Request('https://www.google.com/recaptcha/api/siteverify', data=params)
    result  = _json.loads(urllib.request.urlopen(req).read().decode())

    if not result.get('success'):
        return jsonify({'success': False, 'error': 'CAPTCHA failed'}), 200

    # Check password
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    if password != admin_password:
        return jsonify({'success': False, 'error': 'Wrong password'}), 200

    return jsonify({'success': True}), 200

# ─── UPDATE A LOCATION ───
@app.route('/api/locations/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    try:
        name        = request.form.get('name')
        description = request.form.get('description')

        # Handle optional new image upload
        image_path = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename != '':
                upload_result = cloudinary.uploader.upload(
                    image,
                    folder='lipamap',
                    resource_type='image'
                )
                image_path = upload_result['secure_url']

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

        # Return the updated image_path so the frontend can refresh it
        if not image_path:
            cursor.execute('SELECT image_path FROM locations WHERE id = %s', (location_id,))
            row = cursor.fetchone()
            image_path = row[0] if row else ''

        cursor.close()
        conn.close()

        return jsonify({'message': 'Location updated!', 'image_path': image_path or ''}), 200

    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500

# ─── DELETE A LOCATION ───
@app.route('/api/locations/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM locations WHERE id = %s', (location_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Location deleted!'}), 200
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500

# ─── GET ALL CATEGORIES ───
@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM categories')
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        categories = []
        for row in rows:
            categories.append({
                'id':         row[0],
                'name':       row[1],
                'label':      row[2],
                'emoji':      row[3],
                'color':      row[4],
                'group_type': row[5] if len(row) > 5 else 'green'
            })
        return jsonify(categories)
    except Exception as e:
        return jsonify({'message': 'Error: ' + str(e)}), 500

# ─── ADD A NEW CATEGORY ───
@app.route('/api/categories', methods=['POST'])
def add_category():
    try:
        name       = request.json.get('name')
        label      = request.json.get('label')
        emoji      = request.json.get('emoji')
        color      = request.json.get('color')
        group_type = request.json.get('group_type', 'green')

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO categories (name, label, emoji, color, group_type)
            VALUES (%s, %s, %s, %s, %s)
        ''', (name, label, emoji, color, group_type))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'message': 'Category added!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error: ' + str(e)}), 500

# ─── DELETE A CATEGORY ───
@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    try:
        conn = get_db()
        cursor = conn.cursor()

        # First get the category name
        cursor.execute('SELECT name FROM categories WHERE id = %s', (category_id,))
        row = cursor.fetchone()

        if row:
            category_name = row[0]
            # Delete all locations with this category
            cursor.execute('DELETE FROM locations WHERE category = %s', (category_name,))
            # Then delete the category
            cursor.execute('DELETE FROM categories WHERE id = %s', (category_id,))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Category and its locations deleted!'}), 200
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500
    
# ─── SEED DEFAULT LOCATIONS ───
# Inserts the built-in locations once; skips if they already exist in the DB.
def seed_db():
    import json as _json
    seeds = [
        {
            'name': 'Lipa City Park',
            'category': 'park',
            'description': "The main public recreation park at the heart of Lipa City. Features open lawns, walking paths, children's playground, and a small amphitheater used for community events.",
            'latitude': 13.9415, 'longitude': 121.1637,
            'image_path': '/ComParkLipa.png',
            'info': _json.dumps({'Operating Hours': '5:00 AM – 9:00 PM', 'Area': '3.2 hectares', 'Managed by': 'City Parks & Recreation Office', 'Facilities': 'Benches, Playground, Covered Stage', 'Last Updated': 'December 2025'}),
            'address': 'Poblacion, Lipa City, Batangas'
        },
        {
            'name': 'Lipa Riverside Park',
            'category': 'park',
            'description': 'A linear park running along the riverbank, ideal for jogging and early morning walks. Features native tree plantings and riverside viewing areas.',
            'latitude': 13.9400, 'longitude': 121.1600,
            'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Riverside_park.jpg/640px-Riverside_park.jpg',
            'info': _json.dumps({'Operating Hours': 'Open 24 hours', 'Area': '1.8 hectares', 'Trail Length': '1.2 km', 'Managed by': 'City Environment Office', 'Last Updated': 'November 2025'}),
            'address': 'Poblacion, Lipa City, Batangas'
        },
        {
            'name': 'Mt. Malarayat Forest Reserve',
            'category': 'forest',
            'description': 'A major forested mountain area serving as the primary green lung of Lipa City. Home to endemic bird species and supports watershed protection for eastern barangays.',
            'latitude': 13.9490, 'longitude': 121.1720,
            'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Forest_path.jpg/640px-Forest_path.jpg',
            'info': _json.dumps({'Classification': 'Protected Forest Reserve', 'Area': '420 hectares', 'Elevation': '600–1,150 MASL', 'Key Species': 'Narra, Molave, Philippine Eagle Owl', 'Managed by': 'DENR Region IV-A', 'Last Updated': 'October 2025'}),
            'address': 'Brgy. Mataas na Lupa, Lipa City, Batangas'
        },
        {
            'name': 'Community Garden – Brgy. San Jose',
            'category': 'garden',
            'description': "A community-led urban garden producing fresh vegetables for local households. Established under the city's Urban Agriculture Program. Open to volunteer participation on weekends.",
            'latitude': 13.9350, 'longitude': 121.1500,
            'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Vegetable_garden.jpg/640px-Vegetable_garden.jpg',
            'info': _json.dumps({'Produce': 'Kangkong, Sitaw, Talong, Ampalaya', 'Plots Available': '24 plots', 'Area': '0.5 hectares', 'Program': 'Urban Agriculture Program', 'Contact': 'Brgy. San Jose Hall', 'Last Updated': 'December 2025'}),
            'address': 'Brgy. San Jose, Lipa City, Batangas'
        },
        {
            'name': 'Wetland Reserve – Brgy. Lodlod',
            'category': 'wetland',
            'description': 'A natural wetland providing critical habitat for migratory waterbirds and serving as a natural flood buffer for downstream communities. Currently under habitat restoration.',
            'latitude': 13.9200, 'longitude': 121.1750,
            'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Marshland.jpg/640px-Marshland.jpg',
            'info': _json.dumps({'Classification': 'Natural Wetland', 'Area': '12 hectares', 'Bird Species': '30+ recorded species', 'Status': 'Under Restoration', 'Managed by': 'DENR & City ENRO', 'Last Updated': 'September 2025'}),
            'address': 'Brgy. Lodlod, Lipa City, Batangas'
        },
        {
            'name': 'Recycling Center – City Proper',
            'category': 'recycle',
            'description': 'The primary city-operated materials recovery facility (MRF). Accepts plastic, paper, metal, and glass. Drop-off open to all residents.',
            'latitude': 13.9300, 'longitude': 121.1800,
            'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Recycling_bins.jpg/640px-Recycling_bins.jpg',
            'info': _json.dumps({'Accepts': 'Plastic, Paper, Metal, Glass', 'Capacity': '5 tons/day', 'Operating Hours': 'Mon–Sat, 7:00 AM – 5:00 PM', 'Managed by': 'City Environment Office', 'Contact': '(043) 123-4567', 'Last Updated': 'December 2025'}),
            'address': 'Poblacion, Lipa City, Batangas'
        },
        {
            'name': 'Composting Site – Brgy. Anilao',
            'category': 'compost',
            'description': 'A barangay-level composting facility processing organic kitchen and garden waste. Finished compost is distributed free to community gardens and urban farmers.',
            'latitude': 13.9550, 'longitude': 121.1600,
            'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Compost.jpg/640px-Compost.jpg',
            'info': _json.dumps({'Input Material': 'Kitchen & Garden Waste', 'Output': 'Organic compost (free to residents)', 'Capacity': '800 kg/week', 'Operating Hours': 'Mon, Wed, Fri — 8:00 AM – 12:00 PM', 'Managed by': 'Brgy. Anilao Council', 'Last Updated': 'November 2025'}),
            'address': 'Brgy. Anilao, Lipa City, Batangas'
        },
        {
            'name': 'Waste Collection Point – Brgy. Marawoy',
            'category': 'collection',
            'description': 'Designated barangay waste collection point serving residential zones in Marawoy. Segregated bins for biodegradable, residual, and recyclable waste.',
            'latitude': 13.9380, 'longitude': 121.1680,
            'image_path': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Garbage_collection.jpg/640px-Garbage_collection.jpg',
            'info': _json.dumps({'Collection Schedule': 'Mon, Wed, Fri', 'Collection Time': '6:00 AM – 10:00 AM', 'Bins Available': 'Biodegradable, Recyclable, Residual', 'Serves': 'Approx. 450 households', 'Managed by': 'Brgy. Marawoy & City Sanitation', 'Last Updated': 'December 2025'}),
            'address': 'Brgy. Marawoy, Lipa City, Batangas'
        },
    ]

    conn = get_db()
    cursor = conn.cursor()
    inserted = 0
    for loc in seeds:
        cursor.execute('SELECT id FROM locations WHERE name = %s AND latitude = %s AND longitude = %s',
                       (loc['name'], loc['latitude'], loc['longitude']))
        if cursor.fetchone() is None:
            cursor.execute('''
                INSERT INTO locations (name, category, description, latitude, longitude, image_path, info, address)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (loc['name'], loc['category'], loc['description'],
                  loc['latitude'], loc['longitude'],
                  loc['image_path'], loc['info'], loc['address']))
            inserted += 1
    conn.commit()
    cursor.close()
    conn.close()
    if inserted:
        print(f'🌱 Seeded {inserted} default location(s) into the database.')
    else:
        print('🌱 Seed locations already present, skipping.')

# Run on startup (works for both Gunicorn on Render and direct python app.py)
init_db()
seed_db()

# ─── START THE SERVER ───
if __name__ == '__main__':
    print('✅ LipaMap server is running!')
    print('📍 Open your browser and go to: http://127.0.0.1:5000')
    app.run(debug=True)