import jwt
import datetime
from functools import wraps
from flask import Blueprint, request, jsonify
from backend.config import Config

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def create_admin_token(email: str) -> str:
    payload = {
        "sub": email,
        "role": "admin",
        "iat": datetime.datetime.now(datetime.timezone.utc),
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({"success": False, "error": "Authentication token missing or invalid"}), 401

        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            if payload.get("role") != "admin":
                return jsonify({"success": False, "error": "Insufficient privileges"}), 403
            request.admin_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "error": "Session expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "error": "Invalid authentication token"}), 401

        return f(*args, **kwargs)
    return decorated

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400

    # Verify against configured admin credentials
    if email == Config.ADMIN_EMAIL.lower() and password == Config.ADMIN_PASSWORD:
        token = create_admin_token(email)
        return jsonify({
            "success": True,
            "message": "Login successful",
            "token": token,
            "user": {
                "email": Config.ADMIN_EMAIL,
                "role": "admin"
            }
        }), 200
    else:
        return jsonify({"success": False, "error": "Invalid email or password"}), 401

@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@auth_bp.route("/me", methods=["GET"])
@admin_required
def get_current_user():
    return jsonify({
        "success": True,
        "user": {
            "email": request.admin_user.get("sub", Config.ADMIN_EMAIL),
            "role": "admin"
        }
    }), 200

