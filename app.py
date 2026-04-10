# ═══════════════════════════════════════
# LipaMap — app.py
# Python/Flask backend server
# Now using PostgreSQL (Neon) instead of SQLite
# ═══════════════════════════════════════

from flask import Flask, request, jsonify, send_from_directory
import psycopg2
import os

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

        # Handle image upload
        image_path = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename != '':
                image_path = os.path.join(UPLOAD_FOLDER, image.filename)
                image.save(image_path)

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

        return jsonify({'message': 'Location added successfully!'}), 200

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
    
# ─── START THE SERVER ───
if __name__ == '__main__':
    init_db()
    print('✅ LipaMap server is running!')
    print('📍 Open your browser and go to: http://127.0.0.1:5000')
    app.run(debug=True)