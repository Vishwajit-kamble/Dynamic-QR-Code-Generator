import hashlib
from flask import Blueprint, request, redirect, render_template_string, jsonify
from backend.database.supabase_client import db

redirects_bp = Blueprint("redirects", __name__)

NOT_ACTIVATED_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Not Activated - TapReview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            padding: 36px 28px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 10px;
            color: #0f172a;
        }
        p {
            font-size: 15px;
            color: #64748b;
            line-height: 1.5;
            margin: 0 0 20px;
        }
        .badge {
            display: inline-block;
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
            font-size: 13px;
            padding: 6px 14px;
            border-radius: 20px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🏷️</div>
        <h1>Card Not Activated Yet</h1>
        <p>This physical review card is ready for assignment but has not yet been activated by the TapReview administrator.</p>
        <div class="badge">Card ID: {{ card_code }}</div>
    </div>
</body>
</html>"""

INACTIVE_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Inactive - TapReview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            padding: 36px 28px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 10px;
            color: #0f172a;
        }
        p {
            font-size: 15px;
            color: #64748b;
            line-height: 1.5;
            margin: 0 0 20px;
        }
        .badge {
            display: inline-block;
            background: #fee2e2;
            color: #b91c1c;
            font-weight: 600;
            font-size: 13px;
            padding: 6px 14px;
            border-radius: 20px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">⏸️</div>
        <h1>Review Card Currently Inactive</h1>
        <p>This review card has been temporarily deactivated by the business administrator.</p>
        <div class="badge">Card ID: {{ card_code }}</div>
    </div>
</body>
</html>"""

NOT_FOUND_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Not Found - TapReview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }
        .card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            padding: 36px 28px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 10px;
            color: #0f172a;
        }
        p {
            font-size: 15px;
            color: #64748b;
            line-height: 1.5;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🔍</div>
        <h1>Card Not Found</h1>
        <p>The requested TapReview card code does not exist in the system inventory.</p>
    </div>
</body>
</html>"""

@redirects_bp.route("/r/<slug>", methods=["GET"])
def handle_redirect(slug):
    slug_clean = slug.strip()
    card = db.get_card_by_slug(slug_clean)

    if not card:
        return render_template_string(NOT_FOUND_HTML), 404

    # Check status
    if card["status"] == "AVAILABLE":
        return render_template_string(NOT_ACTIVATED_HTML, card_code=card["card_code"]), 200

    if card["status"] == "DEACTIVATED":
        return render_template_string(INACTIVE_HTML, card_code=card["card_code"]), 200

    if card["status"] == "ACTIVATED":
        business = card.get("business")
        if not business or not business.get("google_review_url"):
            return render_template_string(INACTIVE_HTML, card_code=card["card_code"]), 200

        # Anonymized IP hash for privacy
        client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "")
        ip_hash = hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:16] if client_ip else None
        user_agent = request.headers.get("User-Agent", "")
        referrer = request.headers.get("Referer", "")

        # Record scan event asynchronously or safely
        try:
            db.record_scan_event(
                card_id=card["id"],
                user_agent=user_agent,
                referrer=referrer,
                source="QR/NFC",
                ip_hash=ip_hash
            )
        except Exception as e:
            print(f"[Redirect] Failed to log scan: {e}")

        # HTTP 302 dynamic redirect to Google Review destination
        destination = business["google_review_url"]
        return redirect(destination, code=302)

    return render_template_string(NOT_FOUND_HTML), 404

