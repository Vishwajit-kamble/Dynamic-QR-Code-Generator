from flask import Blueprint, request, jsonify
from backend.routes.auth import admin_required
from backend.database.supabase_client import db

businesses_bp = Blueprint("businesses", __name__, url_prefix="/api/businesses")

@businesses_bp.route("", methods=["GET"])
@admin_required
def get_businesses():
    search = request.args.get("search")
    category = request.args.get("category")
    businesses = db.get_businesses(search=search, category=category)
    return jsonify({"success": True, "count": len(businesses), "businesses": businesses}), 200

@businesses_bp.route("/<business_id>", methods=["GET"])
@admin_required
def get_business(business_id):
    business = db.get_business_by_id(business_id)
    if not business:
        return jsonify({"success": False, "error": "Business not found"}), 404
    return jsonify({"success": True, "business": business}), 200

@businesses_bp.route("/<business_id>", methods=["PUT"])
@admin_required
def update_business(business_id):
    data = request.get_json(silent=True) or {}
    business = db.get_business_by_id(business_id)
    if not business:
        return jsonify({"success": False, "error": "Business not found"}), 404

    # Validate Google Review URL if provided
    new_url = data.get("google_review_url")
    if new_url is not None:
        new_url = new_url.strip()
        if not new_url.lower().startswith("https://"):
            return jsonify({
                "success": False,
                "error": "Invalid URL scheme: Google Review destination must begin with https://"
            }), 400

    # Fields that can be updated
    allowed_fields = [
        "business_name", "category", "contact_name", "phone",
        "email", "address", "google_review_url", "notes"
    ]
    update_data = {k: v.strip() if isinstance(v, str) else v for k, v in data.items() if k in allowed_fields}

    db.update_business(business_id, update_data)
    updated_business = db.get_business_by_id(business_id)
    return jsonify({
        "success": True,
        "message": "Business updated successfully.",
        "business": updated_business
    }), 200

