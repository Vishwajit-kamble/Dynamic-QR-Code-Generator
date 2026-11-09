import io
import csv
import json
from flask import Blueprint, request, jsonify, Response
from backend.routes.auth import admin_required
from backend.config import Config
from backend.database.supabase_client import db

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

@settings_bp.route("", methods=["GET"])
@admin_required
def get_settings():
    return jsonify({
        "success": True,
        "settings": {
            "app_name": "TapReview",
            "public_redirect_base_url": Config.PUBLIC_REDIRECT_BASE_URL,
            "admin_email": Config.ADMIN_EMAIL,
            "timezone": Config.TIMEZONE,
            "total_inventory_target": 50,
            "database_provider": "Supabase PostgreSQL" if Config.is_supabase_configured() else "Local SQLite (Development)",
            "supabase_configured": Config.is_supabase_configured(),
            "cors_origins": Config.CORS_ORIGINS
        }
    }), 200

@settings_bp.route("/base-url", methods=["PUT"])
@admin_required
def update_base_url():
    data = request.get_json(silent=True) or {}
    new_url = data.get("public_redirect_base_url", "").strip().rstrip("/")
    if not new_url or not (new_url.startswith("http://") or new_url.startswith("https://")):
        return jsonify({"success": False, "error": "Valid HTTP or HTTPS base URL required (e.g. http://192.168.1.5:5000 or https://yourdomain.com)"}), 400

    Config.PUBLIC_REDIRECT_BASE_URL = new_url

    # Update .env
    env_file = Config.BASE_DIR / ".env"
    if env_file.exists():
        content = env_file.read_text(encoding="utf-8")
        lines = []
        replaced = False
        for line in content.splitlines():
            if line.startswith("PUBLIC_REDIRECT_BASE_URL="):
                lines.append(f"PUBLIC_REDIRECT_BASE_URL={new_url}")
                replaced = True
            else:
                lines.append(line)
        if not replaced:
            lines.append(f"PUBLIC_REDIRECT_BASE_URL={new_url}")
        env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Update database
    count = db.update_redirect_base_url(new_url)

    # Regenerate all QR codes with new URL
    from backend.services.qr_service import qr_service
    qr_service.generate_all_qr_codes()

    return jsonify({
        "success": True,
        "message": f"Successfully updated base URL to {new_url} and regenerated {count} QR codes.",
        "public_redirect_base_url": new_url
    }), 200

@settings_bp.route("/export/cards-csv", methods=["GET"])
@admin_required
def export_cards_csv():
    cards = db.get_cards()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Card_Code", "Status", "Business_Name", "Google_Review_URL",
        "Permanent_Redirect_URL", "NFC_Status", "Created_At", "Activated_At", "Scan_Count"
    ])
    for c in cards:
        b_name = c.get("business", {}).get("business_name") if c.get("business") else ""
        b_url = c.get("business", {}).get("google_review_url") if c.get("business") else ""
        writer.writerow([
            c["card_code"],
            c["status"],
            b_name,
            b_url,
            c["redirect_url"],
            c.get("nfc_status", "NOT_PROGRAMMED"),
            c.get("created_at", ""),
            c.get("activated_at", ""),
            c.get("scan_count", 0)
        ])
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=TapReview_Cards_Export.csv"}
    )

@settings_bp.route("/export/businesses-csv", methods=["GET"])
@admin_required
def export_businesses_csv():
    businesses = db.get_businesses()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Business_Name", "Category", "Contact_Name", "Phone",
        "Email", "Address", "Google_Review_URL", "Assigned_Card", "Created_At", "Total_Scans"
    ])
    for b in businesses:
        writer.writerow([
            b["business_name"],
            b.get("category", ""),
            b.get("contact_name", ""),
            b.get("phone", ""),
            b.get("email", ""),
            b.get("address", ""),
            b.get("google_review_url", ""),
            b.get("card_code", "Unassigned"),
            b.get("created_at", ""),
            b.get("total_scans", 0)
        ])
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=TapReview_Businesses_Export.csv"}
    )

@settings_bp.route("/export/backup-json", methods=["GET"])
@admin_required
def export_backup_json():
    cards = db.get_cards()
    businesses = db.get_businesses()
    logs = db.get_admin_logs(limit=500)
    metrics = db.get_overview_metrics()

    backup = {
        "export_timestamp": Config.TIMEZONE,
        "app": "TapReview",
        "version": "1.0",
        "summary": metrics,
        "cards": cards,
        "businesses": businesses,
        "admin_logs": logs
    }
    return Response(
        json.dumps(backup, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": "attachment;filename=TapReview_Complete_Backup.json"}
    )

