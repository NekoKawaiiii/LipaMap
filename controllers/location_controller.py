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
    get_images_for_location,
    add_location_image,
    delete_location_image,
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
        category    = normalize_category_key(category)
        description = request.form.get('description')
        latitude    = request.form.get('latitude')
        longitude   = request.form.get('longitude')
        info        = request.form.get('info')
        address     = request.form.get('address')

        # Upload image to Cloudinary if provided
        image_path = None
        if 'image' in request.files:
            image = request.files['image']
            if image.filename != '':
                result     = cloudinary.uploader.upload(image, folder='lipamap', resource_type='image')
                image_path = result['secure_url']

        new_id = create_location(name, category, description, latitude, longitude, image_path, info, address)

        # Insert primary image into location_images at display_order=0
        if image_path:
            add_location_image(new_id, image_path, 0)

        # Handle additional images
        additional_images = request.files.getlist('images')
        display_order = 1
        for img_file in additional_images:
            if img_file.filename != '':
                result = cloudinary.uploader.upload(img_file, folder='lipamap', resource_type='image')
                add_location_image(new_id, result['secure_url'], display_order)
                display_order += 1

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

        # If a new primary image was uploaded, also add it to location_images at display_order=0
        if image_path:
            add_location_image(location_id, image_path, 0)

        # Handle additional images
        additional_images = request.files.getlist('images')
        if additional_images:
            # Get current max display_order for this location
            existing_images = get_images_for_location(location_id)
            max_order = max([img['display_order'] for img in existing_images]) if existing_images else -1
            display_order = max_order + 1
            for img_file in additional_images:
                if img_file.filename != '':
                    result = cloudinary.uploader.upload(img_file, folder='lipamap', resource_type='image')
                    add_location_image(location_id, result['secure_url'], display_order)
                    display_order += 1

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


@location_bp.route('/api/locations/<int:location_id>/images', methods=['GET'])
def get_location_images(location_id):
    try:
        images = get_images_for_location(location_id)
        return jsonify(images), 200
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500


@location_bp.route('/api/locations/<int:location_id>/images/<int:image_id>', methods=['DELETE'])
def remove_location_image(location_id, image_id):
    try:
        delete_location_image(image_id)
        return jsonify({'message': 'Image deleted!'}), 200
    except Exception as e:
        print('Error:', str(e))
        return jsonify({'message': 'Error: ' + str(e)}), 500
