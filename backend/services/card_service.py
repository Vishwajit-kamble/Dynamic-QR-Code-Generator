from typing import List, Dict, Any, Optional
from backend.database.supabase_client import db

class CardService:
    @staticmethod
    def get_all_cards(status: Optional[str] = None, search: Optional[str] = None, nfc_status: Optional[str] = None) -> List[Dict[str, Any]]:
        return db.get_cards(status=status, search=search, nfc_status=nfc_status)

    @staticmethod
    def get_available_cards() -> List[Dict[str, Any]]:
        return db.get_cards(status="AVAILABLE")

    @staticmethod
    def get_card(card_id: str) -> Optional[Dict[str, Any]]:
        return db.get_card_by_id(card_id)

    @staticmethod
    def activate(card_id: str, business_payload: Dict[str, Any]) -> Dict[str, Any]:
        return db.activate_card(card_id, business_payload)

    @staticmethod
    def deactivate(card_id: str, reason: str = "") -> bool:
        return db.deactivate_card(card_id, reason=reason)

    @staticmethod
    def reactivate(card_id: str) -> bool:
        return db.reactivate_card(card_id)

card_service = CardService()

