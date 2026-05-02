# ═══════════════════════════════════════
# LipaMap — models/category_model.py
# Model: all database operations for categories
# ═══════════════════════════════════════

from config import get_db


def get_all_categories():
    """Return all custom categories from the database."""
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
            name       TEXT NOT NULL,
            label      TEXT NOT NULL,
            emoji      TEXT NOT NULL,
            color      TEXT NOT NULL,
            group_type TEXT NOT NULL DEFAULT 'green'
        )
    ''')
    conn.commit()
    cursor.close()
    conn.close()
