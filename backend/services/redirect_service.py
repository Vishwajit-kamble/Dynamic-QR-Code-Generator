import hashlib
from typing import Optional, Tuple
from backend.database.supabase_client import db

class RedirectService:
    @staticmethod
    def resolve_slug(slug: str, client_ip: str = "", user_agent: str = "", referrer: str = "") -> Tuple[str, Optional[str], Optional[dict]]:
        """
        Resolves a redirect slug to its destination:
        Returns (status, destination_or_html_state, card_record)
        Status values: 'REDIRECT', 'NOT_ACTIVATED', 'DEACTIVATED', 'NOT_FOUND'
        """
        card = db.get_card_by_slug(slug.strip())
        if not card:
            return "NOT_FOUND", None, None

        if card["status"] == "AVAILABLE":
            return "NOT_ACTIVATED", None, card

        if card["status"] == "DEACTIVATED":
            return "DEACTIVATED", None, card

        if card["status"] == "ACTIVATED":
            biz = card.get("business")
            if not biz or not biz.get("google_review_url"):
                return "DEACTIVATED", None, card

            # Log scan event
            ip_hash = hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:16] if client_ip else None
            try:
                db.record_scan_event(
                    card_id=card["id"],
                    user_agent=user_agent,
                    referrer=referrer,
                    source="QR/NFC",
                    ip_hash=ip_hash
                )
            except Exception as e:
                print(f"[RedirectService] Failed to log scan: {e}")

            return "REDIRECT", biz["google_review_url"], card

        return "NOT_FOUND", None, None

redirect_service = RedirectService()

