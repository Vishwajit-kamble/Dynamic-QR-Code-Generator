import io
from flask import Blueprint, request, jsonify, send_file, Response
from backend.routes.auth import admin_required
from backend.database.supabase_client import db
from backend.services.qr_service import qr_service
from backend.config import Config

cards_bp = Blueprint("cards", __name__, url_prefix="/api/cards")

@cards_bp.route("", methods=["GET"])
@admin_required
def get_all_cards():
    status = request.args.get("status")
    search = request.args.get("search")
    nfc_status = request.args.get("nfc_status")
    cards = db.get_cards(status=status, search=search, nfc_status=nfc_status)
    return jsonify({"success": True, "count": len(cards), "cards": cards}), 200

@cards_bp.route("/available", methods=["GET"])
@admin_required
def get_available_cards():
    cards = db.get_cards(status="AVAILABLE")
    return jsonify({"success": True, "count": len(cards), "cards": cards}), 200

@cards_bp.route("/<card_id>", methods=["GET"])
@admin_required
def get_card(card_id):
    card = db.get_card_by_id(card_id)
    if not card:
        return jsonify({"success": False, "error": "Card not found"}), 404
    return jsonify({"success": True, "card": card}), 200

@cards_bp.route("/seed", methods=["POST"])
@admin_required
def seed_cards():
    created = db.seed_initial_cards(count=50, base_url=Config.PUBLIC_REDIRECT_BASE_URL)
    return jsonify({
        "success": True,
        "message": f"Successfully initialized {len(created)} new cards.",
        "created_count": len(created),
        "total_cards": len(db.get_cards())
    }), 200

@cards_bp.route("/<card_id>/qr", methods=["GET"])
def get_card_qr(card_id):
    """
    Serves the QR code image. Publicly accessible so it can be previewed or printed easily.
    """
    card = db.get_card_by_id(card_id)
    if not card:
        # Check by slug/code as fallback
        card = db.get_card_by_slug(card_id)
    if not card:
        return jsonify({"success": False, "error": "Card not found"}), 404

    qr_bytes = qr_service.generate_qr_image_bytes(card["redirect_url"], card_code=card["card_code"])
    return send_file(
        io.BytesIO(qr_bytes),
        mimetype="image/png",
        as_attachment=request.args.get("download") == "true",
        download_name=f"{card['card_code']}.png"
    )

@cards_bp.route("/generate-all-qr", methods=["POST"])
@admin_required
def generate_all_qr():
    result = qr_service.generate_all_qr_codes()
    return jsonify({"success": True, "result": result}), 200

@cards_bp.route("/download-all", methods=["GET"])
@admin_required
def download_all_qr_zip():
    zip_buffer = qr_service.create_zip_archive()
    return send_file(
        zip_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name="TapReview_50_QR_Codes.zip"
    )

@cards_bp.route("/manifest-csv", methods=["GET"])
@admin_required
def download_manifest_csv():
    csv_io = qr_service.create_csv_manifest()
    return Response(
        csv_io.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=TapReview_Print_Manifest.csv"}
    )

@cards_bp.route("/print-sheet", methods=["GET"])
@admin_required
def get_print_sheet():
    html = qr_service.generate_print_production_html()
    return Response(html, mimetype="text/html")

@cards_bp.route("/activate", methods=["POST"])
@admin_required
def activate_card():
    data = request.get_json(silent=True) or {}
    card_id = data.get("card_id")
    business_name = data.get("business_name", "").strip()
    google_review_url = data.get("google_review_url", "").strip()

    if not card_id or not business_name or not google_review_url:
        return jsonify({
            "success": False,
            "error": "Card ID, Business Name, and Google Review URL are required."
        }), 400

    # Validate HTTPS scheme
    if not google_review_url.lower().startswith("https://"):
        return jsonify({
            "success": False,
            "error": "Invalid URL scheme: Google Review URL must begin with https://"
        }), 400

    try:
        result = db.activate_card(card_id, data)
        return jsonify({
            "success": True,
            "message": "Card activated successfully!",
            "data": result
        }), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Activation failed: {str(e)}"}), 500

@cards_bp.route("/<card_id>/deactivate", methods=["POST"])
@admin_required
def deactivate_card(card_id):
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "")
    try:
        db.deactivate_card(card_id, reason=reason)
        return jsonify({"success": True, "message": "Card deactivated successfully."}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@cards_bp.route("/<card_id>/reactivate", methods=["POST"])
@admin_required
def reactivate_card(card_id):
    try:
        db.reactivate_card(card_id)
        return jsonify({"success": True, "message": "Card reactivated successfully for original business."}), 200
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

