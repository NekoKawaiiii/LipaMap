# ═══════════════════════════════════════
# LipaMap — controllers/auth_controller.py
# Controller: admin login (password only, no reCAPTCHA)
# ═══════════════════════════════════════

import os
from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/verify-password', methods=['POST'])
def verify_password():
    data     = request.get_json()
    password = data.get('password', '')

    # Verify admin password
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    if password != admin_password:
        return jsonify({'success': False, 'error': 'Incorrect password'}), 200

    return jsonify({'success': True}), 200
