# ═══════════════════════════════════════
# LipaMap — controllers/category_controller.py
# Controller: HTTP routes for /api/categories
# ═══════════════════════════════════════

from flask import Blueprint, request, jsonify
from models.category_model import (
    get_all_categories,
    create_category,
    delete_category,
)

category_bp = Blueprint('categories', __name__)


@category_bp.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        categories = get_all_categories()
        return jsonify(categories)
    except Exception as e:
        return jsonify({'message': 'Error: ' + str(e)}), 500


@category_bp.route('/api/categories', methods=['POST'])
def add_category():
    try:
        data       = request.get_json()
        name       = data.get('name')
        label      = data.get('label')
        emoji      = data.get('emoji')
        color      = data.get('color')
        group_type = data.get('group_type', 'green')

        create_category(name, label, emoji, color, group_type)
        return jsonify({'message': 'Category added!'}), 200
    except Exception as e:
        return jsonify({'message': 'Error: ' + str(e)}), 500


@category_bp.route('/api/categories/<int:category_id>', methods=['DELETE'])
def remove_category(category_id):
    try:
        delete_category(category_id)
        return jsonify({'message': 'Category and its locations deleted!'}), 200
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500
