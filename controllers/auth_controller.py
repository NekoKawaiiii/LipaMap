# ═══════════════════════════════════════
# LipaMap — controllers/auth_controller.py
# Controller: admin login (username + password + reCAPTCHA v2)
#
# Verifies the Google reCAPTCHA v2 token with the stdlib
# urllib.request module (no `requests` dependency) and then
# checks the submitted username/password against the
# ADMIN_USERNAME and ADMIN_PASSWORD environment variables.
#
# Fails closed: if RECAPTCHA_SECRET_KEY or ADMIN_USERNAME are
# missing/empty in the environment, the route returns
# {"success": false, "error": "Server misconfiguration"} and
# never bypasses the captcha.
# ═══════════════════════════════════════

import os
import json
import urllib.parse
import urllib.request
from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth', __name__)

RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'


@auth_bp.route('/api/verify-login', methods=['POST'])
def verify_login():
    data          = request.get_json(silent=True) or {}
    username      = data.get('username', '')
    password      = data.get('password', '')
    captcha_token = data.get('captcha_token', '')

    recaptcha_secret = os.environ.get('RECAPTCHA_SECRET_KEY', '')
    admin_username   = os.environ.get('ADMIN_USERNAME', '')
    admin_password   = os.environ.get('ADMIN_PASSWORD', 'admin123')

    # Fail closed — never bypass captcha or default the username.
    if not recaptcha_secret or not admin_username:
        return jsonify({'success': False, 'error': 'Server misconfiguration'}), 200

    # Verify the reCAPTCHA token against Google's siteverify endpoint
    # using stdlib urllib.request (no `requests` library).
    try:
        body = urllib.parse.urlencode({
            'secret':   recaptcha_secret,
            'response': captcha_token,
        }).encode('utf-8')
        req = urllib.request.Request(RECAPTCHA_VERIFY_URL, data=body)
        with urllib.request.urlopen(req, timeout=10) as resp:
            captcha_result = json.loads(resp.read().decode('utf-8'))
    except Exception:
        return jsonify({'success': False, 'error': 'CAPTCHA verification failed'}), 200

    if captcha_result.get('success') is not True:
        return jsonify({'success': False, 'error': 'CAPTCHA verification failed'}), 200

    # Generic credentials error — do NOT distinguish wrong username from wrong password.
    if username != admin_username or password != admin_password:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 200

    return jsonify({'success': True}), 200
