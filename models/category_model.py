# ═══════════════════════════════════════
# LipaMap — models/category_model.py
# Model: all database operations for categories
# ═══════════════════════════════════════

from config import get_db


BUILTIN_CATEGORIES = [
    {'name': 'park',       'label': 'Parks',             'emoji': '🌳', 'color': '#3b82f6', 'group_type': 'green'},
    {'name': 'forest',     'label': 'Urban Forests',      'emoji': '🌲', 'color': '#166534', 'group_type': 'green'},
    {'name': 'wetland',    'label': 'Wetlands',           'emoji': '💧', 'color': '#06b6d4', 'group_type': 'green'},
    {'name': 'recycle',    'label': 'Recycling Centers',  'emoji': '♻️', 'color': '#f59e0b', 'group_type': 'waste'},
    {'name': 'collection', 'label': 'Collection Points',  'emoji': '🚛', 'color': '#6b7280', 'group_type': 'waste'},
]


# ─── CATEGORY KEY NORMALIZATION ───
# Known aliases that map to canonical category keys.
# NOTE: This map must be kept in sync with _CATEGORY_ALIAS_MAP in script.js
_ALIAS_MAP = {
    'urban_forest': 'forest',
    'urbanforest': 'forest',
    'urban_forests': 'forest',
    'parks': 'park',
    'gardens': 'garden',
    'wetlands': 'wetland',
    'recycling': 'recycle',
    'recycling_center': 'recycle',
    'recycling_centers': 'recycle',
    'collection_point': 'collection',
    'collection_points': 'collection',
    'composting': 'compost',
}

_CANONICAL_NAMES = {cat['name'] for cat in BUILTIN_CATEGORIES}


def normalize_category_key(raw_key):
    """Normalize a raw category key to its canonical form."""
    if not raw_key:
        return raw_key
    normalized = raw_key.strip().lower().replace(' ', '_').replace('-', '_')
    if normalized in _CANONICAL_NAMES:
        return normalized
    if normalized in _ALIAS_MAP:
        return _ALIAS_MAP[normalized]
    return normalized


def get_all_categories():
    """Return all categories from the database."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM categories')
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            'id':         row[0],
            'name':       row[1],
            'label':      row[2],
            'emoji':      row[3],
            'color':      row[4],
            'group_type': row[5] if len(row) > 5 else 'green'
        }
        for row in rows
    ]


def create_category(name, label, emoji, color, group_type='green'):
    """Insert a new category."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO categories (name, label, emoji, color, group_type)
        VALUES (%s, %s, %s, %s, %s)
    ''', (name, label, emoji, color, group_type))
    conn.commit()
    cursor.close()
    conn.close()


def delete_category(category_id):
    """Delete a category and cascade-delete all its locations."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM categories WHERE id = %s', (category_id,))
    row = cursor.fetchone()
    if row:
        cursor.execute('DELETE FROM locations WHERE category = %s', (row[0],))
        cursor.execute('DELETE FROM categories WHERE id = %s', (category_id,))
    conn.commit()
    cursor.close()
    conn.close()


def init_categories_table():
    """Create the categories table if it does not exist."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id         SERIAL PRIMARY KEY,
            name       TEXT NOT NULL UNIQUE,
            label      TEXT NOT NULL,
            emoji      TEXT NOT NULL,
            color      TEXT NOT NULL,
            group_type TEXT NOT NULL DEFAULT 'green'
        )
    ''')
    # Add unique constraint to existing table if missing
    cursor.execute('''
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key'
            ) THEN
                ALTER TABLE categories ADD CONSTRAINT categories_name_key UNIQUE (name);
            END IF;
        END $$;
    ''')
    conn.commit()
    cursor.close()
    conn.close()


def seed_categories():
    """Insert built-in categories once; skip any that already exist."""
    conn = get_db()
    cursor = conn.cursor()
    inserted = 0
    for cat in BUILTIN_CATEGORIES:
        cursor.execute('''
            INSERT INTO categories (name, label, emoji, color, group_type)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (name) DO NOTHING
        ''', (cat['name'], cat['label'], cat['emoji'], cat['color'], cat['group_type']))
        if cursor.rowcount:
            inserted += 1
    conn.commit()
    cursor.close()
    conn.close()
    if inserted:
        print(f'🏷️  Seeded {inserted} built-in category/categories.')
    else:
        print('🏷️  Built-in categories already present, skipping.')
