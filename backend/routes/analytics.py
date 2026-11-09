from flask import Blueprint, request, jsonify
from backend.routes.auth import admin_required
from backend.database.supabase_client import db

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")

@analytics_bp.route("/overview", methods=["GET"])
@admin_required
def get_overview():
    metrics = db.get_overview_metrics()
    return jsonify({"success": True, "data": metrics}), 200

@analytics_bp.route("/cards", methods=["GET"])
@admin_required
def get_card_analytics():
    cards = db.get_cards()
    # Sort cards by scan_count descending
    cards_sorted = sorted(cards, key=lambda x: x.get("scan_count", 0), reverse=True)
    card_summary = [
        {
            "id": c["id"],
            "card_code": c["card_code"],
            "status": c["status"],
            "business_name": c.get("business", {}).get("business_name") if c.get("business") else "Unassigned",
            "scan_count": c.get("scan_count", 0),
            "nfc_status": c.get("nfc_status", "NOT_PROGRAMMED"),
            "activated_at": c.get("activated_at")
        }
        for c in cards_sorted
    ]
    return jsonify({"success": True, "count": len(card_summary), "data": card_summary}), 200

@analytics_bp.route("/businesses", methods=["GET"])
@admin_required
def get_business_analytics():
    businesses = db.get_businesses()
    sorted_businesses = sorted(businesses, key=lambda x: x.get("total_scans", 0), reverse=True)
    return jsonify({"success": True, "count": len(sorted_businesses), "data": sorted_businesses}), 200

@analytics_bp.route("/trends", methods=["GET"])
@admin_required
def get_trends():
    """
    Returns time series data for Recharts (e.g. daily scans, monthly aggregations).
    """
    cards = db.get_cards()
    metrics = db.get_overview_metrics()
    # Group recent scans by date
    daily_map = {}
    for scan in metrics.get("recent_scans", []):
        dt = scan.get("scanned_at", "")[:10]  # YYYY-MM-DD
        if dt:
            daily_map[dt] = daily_map.get(dt, 0) + 1

    trend_list = [{"date": k, "scans": v} for k, v in sorted(daily_map.items())]

    # Inventory distribution for pie / bar chart
    inventory_distribution = [
        {"name": "Available", "value": metrics["available_cards"], "color": "#10b981"},
        {"name": "Activated", "value": metrics["activated_cards"], "color": "#0ea5e9"},
        {"name": "Deactivated", "value": metrics["deactivated_cards"], "color": "#f43f5e"},
    ]

    return jsonify({
        "success": True,
        "daily_trends": trend_list,
        "inventory_distribution": inventory_distribution,
        "total_scans": metrics["total_scans"]
    }), 200

@analytics_bp.route("/logs", methods=["GET"])
@admin_required
def get_audit_logs():
    limit = int(request.args.get("limit", 50))
    logs = db.get_admin_logs(limit=limit)
    return jsonify({"success": True, "count": len(logs), "logs": logs}), 200

