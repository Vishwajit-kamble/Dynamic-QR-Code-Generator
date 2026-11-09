import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import Config
from backend.database.supabase_client import db
from backend.services.qr_service import qr_service

def main():
    if len(sys.argv) < 2:
        print("[!] Usage: python backend/update_base_url.py <new_base_url>")
        print("[!] Example: python backend/update_base_url.py http://10.224.253.245:5000")
        print("[!] Example: python backend/update_base_url.py https://tapreview.io")
        return

    new_url = sys.argv[1].strip().rstrip("/")
    if not (new_url.startswith("http://") or new_url.startswith("https://")):
        print("[!] Error: URL must start with http:// or https://")
        return

    print(f"[*] Updating base URL to: {new_url}")
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
        print("[+] Updated backend/.env successfully.")

    # Update database
    count = db.update_redirect_base_url(new_url)
    print(f"[+] Updated {count} card redirect URLs in database.")

    # Regenerate all QR codes
    print("[*] Regenerating all 50 high-resolution print QR codes...")
    res = qr_service.generate_all_qr_codes()
    print(f"[+] Regenerated {res['total_generated']} QR codes in {res['output_directory']}.")
    print("\n[✓] Done! When you scan any QR code now, your phone will open the new URL:")
    print(f"    Sample: {new_url}/r/TR001")
    print(f"    Sample: {new_url}/r/TR002")

if __name__ == "__main__":
    main()

