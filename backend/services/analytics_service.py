from typing import Dict, Any, List
from backend.database.supabase_client import db

class AnalyticsService:
    @staticmethod
    def get_overview() -> Dict[str, Any]:
        return db.get_overview_metrics()

    @staticmethod
    def get_card_rankings() -> List[Dict[str, Any]]:
        cards = db.get_cards()
        return sorted(cards, key=lambda x: x.get("scan_count", 0), reverse=True)

    @staticmethod
    def get_business_rankings() -> List[Dict[str, Any]]:
        businesses = db.get_businesses()
        return sorted(businesses, key=lambda x: x.get("total_scans", 0), reverse=True)

    @staticmethod
    def get_audit_trail(limit: int = 50) -> List[Dict[str, Any]]:
        return db.get_admin_logs(limit=limit)

analytics_service = AnalyticsService()

