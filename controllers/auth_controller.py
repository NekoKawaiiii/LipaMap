# ═══════════════════════════════════════
# LipaMap — controllers/auth_controller.py
# Controller: admin login + reCAPTCHA verification
# ═══════════════════════════════════════

import os
import json
import urllib.request
import urllib.parse
from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/verify-captcha', methods=['POST'])
def verify_captcha():
    data       = request.get_json()
    token      = data.get('token', '')
    password   = data.get('password', '')
    secret_key = os.environ.get('RECAPTCHA_SECRET_KEY', '6LcfhdMsAAAAAIZnQugz8pOoGXzJoIgf2jmjx8SJ')

    # Verify reCAPTCHA token with Google
    params = urllib.parse.urlencode({'secret': secret_key, 'response': token}).encode()
    req    = urllib.request.Request('https://www.google.com/recaptcha/api/siteverify', data=params)
    result = json.loads(urllib.request.urlopen(req).read().decode())

    if not result.get('success'):
        return jsonify({'success': False, 'error': 'CAPTCHA verification failed'}), 200

    # Verify admin password
    admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    if password != admin_password:
        return jsonify({'success': False, 'error': 'Incorrect password'}), 200

    return jsonify({'success': True}), 200
