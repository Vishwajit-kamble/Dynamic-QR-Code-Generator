import io
import csv
import zipfile
from pathlib import Path
from typing import List, Dict, Any, Optional
import qrcode
from qrcode.image.styledpil import StyledPilImage
from PIL import Image, ImageDraw, ImageFont

from backend.config import Config
from backend.database.supabase_client import db

class QRService:
    def __init__(self):
        self.output_dir = Config.QR_OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir = Config.PRODUCTION_EXPORTS_DIR
        self.exports_dir.mkdir(parents=True, exist_ok=True)

    def generate_qr_image_bytes(self, url: str, card_code: str = "") -> bytes:
        """
        Generates a high-resolution, print-ready QR code PNG in memory.
        High error correction (ERROR_CORRECT_H), clean quiet zone.
        """
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=12,
            border=4
        )
        qr.add_data(url)
        qr.make(fit=True)

        # Basic PIL image with pure black and pure white
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")

        # Optional label under QR if card_code provided
        if card_code:
            label_height = 40
            total_height = img.height + label_height
            canvas = Image.new("RGB", (img.width, total_height), "white")
            canvas.paste(img, (0, 0))
            draw = ImageDraw.Draw(canvas)
            # Center card code text
            text = f"TapReview: {card_code}"
            # Use default font or load standard font
            draw.text((img.width // 2 - 40, img.height + 10), text, fill="black")
            final_img = canvas
        else:
            final_img = img

        buffer = io.BytesIO()
        final_img.save(buffer, format="PNG", dpi=(300, 300))
        buffer.seek(0)
        return buffer.getvalue()

    def generate_and_save_qr_for_card(self, card: Dict[str, Any]) -> str:
        """Generates QR code for card and saves it to disk."""
        card_code = card["card_code"]
        redirect_url = card["redirect_url"]
        png_filename = f"{card_code}.png"
        file_path = self.output_dir / png_filename

        qr_bytes = self.generate_qr_image_bytes(redirect_url, card_code=card_code)
        with open(file_path, "wb") as f:
            f.write(qr_bytes)

        # Update card qr_image_path and production status
        db.update_card(card["id"], {
            "qr_image_path": str(file_path.relative_to(Config.PROJECT_ROOT)),
            "qr_production_status": "GENERATED"
        })
        return str(file_path)

    def generate_all_qr_codes(self) -> Dict[str, Any]:
        """Generates QR codes for all inventory cards."""
        cards = db.get_cards()
        generated = []
        for card in cards:
            path = self.generate_and_save_qr_for_card(card)
            generated.append({
                "card_code": card["card_code"],
                "path": path,
                "url": card["redirect_url"]
            })
        db.log_admin_action("GENERATE_ALL_QRS", None, None, f"Generated print QR codes for all {len(generated)} cards")
        return {
            "total_generated": len(generated),
            "output_directory": str(self.output_dir),
            "cards": generated
        }

    def create_zip_archive(self) -> io.BytesIO:
        """Packages all 50 generated QR PNGs into a single ZIP in memory."""
        cards = db.get_cards()
        # Ensure they are generated
        for c in cards:
            file_path = self.output_dir / f"{c['card_code']}.png"
            if not file_path.exists():
                self.generate_and_save_qr_for_card(c)

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for c in cards:
                file_path = self.output_dir / f"{c['card_code']}.png"
                if file_path.exists():
                    zf.write(file_path, arcname=f"{c['card_code']}.png")
        zip_buffer.seek(0)
        return zip_buffer

    def create_csv_manifest(self) -> io.StringIO:
        """Generates a CSV manifest of card IDs and redirect URLs for print factory."""
        cards = db.get_cards()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Card_Code", "Permanent_Redirect_URL", "QR_File_Name", "Status", "NFC_Programming_Status"])
        for c in cards:
            writer.writerow([
                c["card_code"],
                c["redirect_url"],
                f"{c['card_code']}.png",
                c["status"],
                c.get("nfc_status", "NOT_PROGRAMMED")
            ])
        output.seek(0)
        return output

    def generate_print_production_html(self) -> str:
        """
        Generates a clean HTML print-production sheet with QR codes and Card IDs
        ready for printing on A4 or sticker sheets.
        """
        cards = db.get_cards()
        items_html = ""
        for c in cards:
            file_path = self.output_dir / f"{c['card_code']}.png"
            if not file_path.exists():
                self.generate_and_save_qr_for_card(c)

            items_html += f"""
            <div class="card-item">
                <div class="card-header">{c['card_code']}</div>
                <img src="/api/cards/{c['id']}/qr" alt="{c['card_code']}" />
                <div class="card-url">{c['redirect_url']}</div>
            </div>
            """

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TapReview Print Production Sheet - 50 Cards</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #fff;
            color: #1e293b;
            margin: 20px;
        }}
        h1 {{ text-align: center; margin-bottom: 5px; }}
        p.subtitle {{ text-align: center; color: #64748b; margin-top: 0; margin-bottom: 25px; }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            page-break-inside: auto;
        }}
        .card-item {{
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            background: #f8fafc;
            page-break-inside: avoid;
        }}
        .card-header {{
            font-weight: 700;
            font-size: 16px;
            color: #0f172a;
            margin-bottom: 6px;
        }}
        .card-item img {{
            width: 140px;
            height: 140px;
            display: block;
            margin: 0 auto;
        }}
        .card-url {{
            font-size: 9px;
            color: #64748b;
            word-break: break-all;
            margin-top: 6px;
        }}
        @media print {{
            body {{ margin: 0; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="padding: 10px 18px; font-weight: 600; background: #0d9488; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
            Print / Save as PDF
        </button>
    </div>
    <h1>TapReview Physical Cards Print Sheet</h1>
    <p class="subtitle">Permanent QR Codes &amp; Manufacturing Manifest (50 Initial Cards)</p>
    <div class="grid">
        {items_html}
    </div>
</body>
</html>"""

qr_service = QRService()

