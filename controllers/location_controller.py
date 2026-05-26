# ═══════════════════════════════════════
# LipaMap — controllers/location_controller.py
# Controller: HTTP routes for /api/locations
# ═══════════════════════════════════════

from flask import Blueprint, request, jsonify
import cloudinary.uploader
from models.location_model import (
    get_all_locations,
    create_location,
    update_location,
    delete_location,
)
from models.category_model import normalize_category_key

location_bp = Blueprint('locations', __name__)


@location_bp.route('/api/locations', methods=['GET'])
def get_locations():
    locations = get_all_locations()
    return jsonify(locations)


@location_bp.route('/api/locations', methods=['POST'])
def add_location():
    try:
        name        = request.form.get('name')
        category    = request.form.get('category')
        description = request.form.get('description')
        latitude    = request.form.get('latitude')
        longitude   = request.form.get('longitude')
        info        = request.form.get('info')
        address     = request.form.get('address')

        # Normalize category key to canonical form
        category = normalize_category_key(category)

        # Upload image to Cloudinary if provided
        image_path = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename != '':
                result     = cloudinary.uploader.upload(image, folder='lipamap', resource_type='image')
                image_path = result['secure_url']

        create_location(name, category, description, latitude, longitude, image_path, info, address)
        return jsonify({'message': 'Location added successfully!', 'image_path': image_path or ''}), 200

    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500


@location_bp.route('/api/locations/<int:location_id>', methods=['PUT'])
def edit_location(location_id):
    try:
        name        = request.form.get('name')
        description = request.form.get('description')

        # Upload new image to Cloudinary if provided
        image_path = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename != '':
                result     = cloudinary.uploader.upload(image, folder='lipamap', resource_type='image')
                image_path = result['secure_url']

        current_image = update_location(location_id, name, description, image_path)
        return jsonify({'message': 'Location updated!', 'image_path': current_image}), 200

    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500


@location_bp.route('/api/locations/<int:location_id>', methods=['DELETE'])
def remove_location(location_id):
    try:
        delete_location(location_id)
        return jsonify({'message': 'Location deleted!'}), 200
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500
