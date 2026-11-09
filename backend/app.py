import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from backend.config import Config
from backend.database.supabase_client import db

from backend.routes.auth import auth_bp
from backend.routes.cards import cards_bp
from backend.routes.businesses import businesses_bp
from backend.routes.redirects import redirects_bp
from backend.routes.analytics import analytics_bp
from backend.routes.nfc import nfc_bp
from backend.routes.settings import settings_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend origins
    CORS(
        app,
        resources={r"/*": {"origins": Config.CORS_ORIGINS + ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]}},
        supports_credentials=True
    )

    # Health check endpoint
    @app.route("/health", methods=["GET"])
    @app.route("/api/health", methods=["GET"])
    def health_check():
        cards_count = len(db.get_cards())
        return jsonify({
            "status": "healthy",
            "service": "TapReview Backend API",
            "database_provider": "Supabase" if Config.is_supabase_configured() else "Local SQLite",
            "cards_in_inventory": cards_count,
            "version": "1.0.0"
        }), 200

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(cards_bp)
    app.register_blueprint(businesses_bp)
    app.register_blueprint(redirects_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(nfc_bp)
    app.register_blueprint(settings_bp)

    # Serve Built Frontend SPA if dist exists
    dist_dir = Config.PROJECT_ROOT / "frontend" / "dist"
    if dist_dir.exists():
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            if path.startswith("api") or path.startswith("r/"):
                return jsonify({"success": False, "error": "Endpoint not found"}), 404
            target_file = dist_dir / path
            if path != "" and target_file.exists() and not target_file.is_dir():
                return send_from_directory(dist_dir, path)
            return send_from_directory(dist_dir, "index.html")

    # Global Error Handlers
    @app.errorhandler(404)
    def handle_404(e):
        return jsonify({"success": False, "error": "Requested resource not found"}), 404

    @app.errorhandler(500)
    def handle_500(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    # Auto-seed initial 50 cards if database is empty
    with app.app_context():
        try:
            cards = db.get_cards()
            if len(cards) < 50:
                print(f"[*] Initializing TapReview inventory (current: {len(cards)} cards)...")
                db.seed_initial_cards(count=50, base_url=Config.PUBLIC_REDIRECT_BASE_URL)
                print(f"[+] 50 cards initialized successfully.")
        except Exception as e:
            print(f"[!] Auto-seed warning: {e}")

    return app

app = create_app()

if __name__ == "__main__":
    print(f"[*] Starting TapReview backend on port {Config.PORT}...")
    print(f"[*] Redirect base URL: {Config.PUBLIC_REDIRECT_BASE_URL}")
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
