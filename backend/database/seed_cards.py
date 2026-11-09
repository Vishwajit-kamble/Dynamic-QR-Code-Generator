import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.config import Config
from backend.database.supabase_client import db

def run_seed():
    print(f"[*] Starting card inventory seed for {Config.PUBLIC_REDIRECT_BASE_URL}...")
    cards = db.seed_initial_cards(count=50, base_url=Config.PUBLIC_REDIRECT_BASE_URL)
    print(f"[+] Seeding completed. {len(cards)} new cards inserted.")
    all_cards = db.get_cards()
    print(f"[+] Current total inventory count: {len(all_cards)} cards.")
    if all_cards:
        print(f"[+] Sample first card: {all_cards[0]['card_code']} -> {all_cards[0]['redirect_url']}")
        print(f"[+] Sample last card: {all_cards[-1]['card_code']} -> {all_cards[-1]['redirect_url']}")

if __name__ == "__main__":
    run_seed()

