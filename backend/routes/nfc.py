import datetime
from flask import Blueprint, request, jsonify
from backend.routes.auth import admin_required
from backend.database.supabase_client import db

nfc_bp = Blueprint("nfc", __name__, url_prefix="/api/cards")

@nfc_bp.route("/<card_id>/nfc", methods=["GET"])
@admin_required
def get_nfc_details(card_id):
    card = db.get_card_by_id(card_id)
    if not card:
        return jsonify({"success": False, "error": "Card not found"}), 404

    return jsonify({
        "success": True,
        "card_id": card["id"],
        "card_code": card["card_code"],
        "nfc_url": card["redirect_url"],
        "qr_url": card["redirect_url"],
        "nfc_status": card.get("nfc_status", "NOT_PROGRAMMED"),
        "nfc_programmed_at": card.get("nfc_programmed_at"),
        "nfc_tested_at": card.get("nfc_tested_at"),
        "instructions": [
            "1. Open NFC Tools app on your mobile phone (Android / iOS).",
            "2. Select 'Write' -> 'Add a record' -> 'URL / URI'.",
            f"3. Paste the exact NFC URL: {card['redirect_url']}",
            "4. Tap 'Write' and hold the physical card near the top-rear of your smartphone until confirmed.",
            "5. Mark status below as PROGRAMMED, then tap 'Test' to verify."
        ]
    }), 200

@nfc_bp.route("/<card_id>/nfc-status", methods=["POST"])
@admin_required
def update_nfc_status(card_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get("nfc_status")

    valid_statuses = ["NOT_PROGRAMMED", "PROGRAMMED", "TESTED"]
    if new_status not in valid_statuses:
        return jsonify({
            "success": False,
            "error": f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}"
        }), 400

    card = db.get_card_by_id(card_id)
    if not card:
        return jsonify({"success": False, "error": "Card not found"}), 404

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_data = {"nfc_status": new_status}
    if new_status == "PROGRAMMED":
        update_data["nfc_programmed_at"] = now_iso
    elif new_status == "TESTED":
        if not card.get("nfc_programmed_at"):
            update_data["nfc_programmed_at"] = now_iso
        update_data["nfc_tested_at"] = now_iso

    db.update_card(card_id, update_data)
    db.log_admin_action("UPDATE_NFC_STATUS", card_id, card.get("business_id"), f"Card {card['card_code']} NFC status set to {new_status}")

    updated_card = db.get_card_by_id(card_id)
    return jsonify({
        "success": True,
        "message": f"NFC status updated to {new_status}",
        "card": updated_card
    }), 200

