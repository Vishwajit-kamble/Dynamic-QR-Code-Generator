import sqlite3
import uuid
import datetime
from typing import Dict, Any, List, Optional
from backend.config import Config

try:
    from supabase import create_client, Client
except ImportError:
    Client = None
    create_client = None

class DatabaseManager:
    """
    Unified database manager for TapReview.
    Supports Supabase PostgreSQL when credentials are provided in Config,
    and provides a persistent local SQLite backend for development and test execution.
    All business rules, integrity constraints, and permanent assignment guarantees are enforced.
    """
    def __init__(self):
        self.use_supabase = Config.is_supabase_configured()
        self.supabase_client: Optional[Client] = None

        if self.use_supabase and create_client:
            try:
                self.supabase_client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)
                print("[DB] Connected to Supabase PostgreSQL.")
            except Exception as e:
                print(f"[DB] Error connecting to Supabase: {e}. Falling back to local SQLite.")
                self.use_supabase = False

        if not self.use_supabase:
            self._init_sqlite_db()

    def _get_sqlite_connection(self):
        Config.SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(Config.SQLITE_DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_sqlite_db(self):
        """Initialize SQLite tables matching the Supabase PostgreSQL schema."""
        conn = self._get_sqlite_connection()
        with conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS businesses (
                    id TEXT PRIMARY KEY,
                    business_name TEXT NOT NULL,
                    category TEXT,
                    contact_name TEXT,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    google_review_url TEXT NOT NULL,
                    notes TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS cards (
                    id TEXT PRIMARY KEY,
                    card_code TEXT UNIQUE NOT NULL,
                    slug TEXT UNIQUE NOT NULL,
                    redirect_url TEXT UNIQUE NOT NULL,
                    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ACTIVATED', 'DEACTIVATED')),
                    business_id TEXT NULL UNIQUE REFERENCES businesses(id) ON DELETE RESTRICT,
                    qr_image_path TEXT NULL,
                    qr_production_status TEXT DEFAULT 'PENDING' CHECK (qr_production_status IN ('PENDING', 'GENERATED', 'PRINTED')),
                    nfc_status TEXT DEFAULT 'NOT_PROGRAMMED' CHECK (nfc_status IN ('NOT_PROGRAMMED', 'PROGRAMMED', 'TESTED')),
                    nfc_programmed_at TEXT NULL,
                    nfc_tested_at TEXT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    activated_at TEXT NULL,
                    deactivated_at TEXT NULL
                );

                CREATE TABLE IF NOT EXISTS scan_events (
                    id TEXT PRIMARY KEY,
                    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
                    scanned_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    user_agent TEXT,
                    referrer TEXT,
                    source TEXT DEFAULT 'QR/NFC',
                    ip_hash TEXT
                );

                CREATE TABLE IF NOT EXISTS admin_logs (
                    id TEXT PRIMARY KEY,
                    action TEXT NOT NULL,
                    card_id TEXT NULL REFERENCES cards(id) ON DELETE SET NULL,
                    business_id TEXT NULL REFERENCES businesses(id) ON DELETE SET NULL,
                    description TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    admin_user_id TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);
                CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
                CREATE INDEX IF NOT EXISTS idx_cards_card_code ON cards(card_code);
                CREATE INDEX IF NOT EXISTS idx_scan_events_card_id ON scan_events(card_id);
                CREATE INDEX IF NOT EXISTS idx_scan_events_scanned_at ON scan_events(scanned_at);
            """)
        conn.close()
        print("[DB] Local SQLite initialized successfully at", Config.SQLITE_DB_PATH)

    # ----------------------------------------------------
    # CARDS OPERATIONS
    # ----------------------------------------------------
    def seed_initial_cards(self, count: int = 50, base_url: str = None) -> List[Dict[str, Any]]:
        """Seeds TR001 to TR050 if not already present."""
        if not base_url:
            base_url = Config.PUBLIC_REDIRECT_BASE_URL
        base_url = base_url.rstrip("/")

        created = []
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if self.use_supabase:
            # Check existing count
            res = self.supabase_client.table("cards").select("card_code").execute()
            existing_codes = {row["card_code"] for row in (res.data or [])}

            to_insert = []
            for i in range(1, count + 1):
                code = f"TR{i:03d}"
                if code not in existing_codes:
                    to_insert.append({
                        "id": str(uuid.uuid4()),
                        "card_code": code,
                        "slug": code,
                        "redirect_url": f"{base_url}/r/{code}",
                        "status": "AVAILABLE",
                        "qr_production_status": "PENDING",
                        "nfc_status": "NOT_PROGRAMMED",
                        "created_at": now_iso
                    })
            if to_insert:
                insert_res = self.supabase_client.table("cards").insert(to_insert).execute()
                created = insert_res.data or []
        else:
            conn = self._get_sqlite_connection()
            with conn:
                cur = conn.cursor()
                cur.execute("SELECT card_code FROM cards")
                existing_codes = {row["card_code"] for row in cur.fetchall()}

                for i in range(1, count + 1):
                    code = f"TR{i:03d}"
                    if code not in existing_codes:
                        card_id = str(uuid.uuid4())
                        redirect_url = f"{base_url}/r/{code}"
                        cur.execute("""
                            INSERT INTO cards (id, card_code, slug, redirect_url, status, qr_production_status, nfc_status, created_at)
                            VALUES (?, ?, ?, ?, 'AVAILABLE', 'PENDING', 'NOT_PROGRAMMED', ?)
                        """, (card_id, code, code, redirect_url, now_iso))
                        created.append({
                            "id": card_id,
                            "card_code": code,
                            "slug": code,
                            "redirect_url": redirect_url,
                            "status": "AVAILABLE",
                            "qr_production_status": "PENDING",
                            "nfc_status": "NOT_PROGRAMMED",
                            "created_at": now_iso
                        })
            conn.close()

        self.log_admin_action("SEED_CARDS", None, None, f"Seeded initial {len(created)} inventory cards")
        return created

    def get_cards(self, status: Optional[str] = None, search: Optional[str] = None, nfc_status: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.use_supabase:
            query = self.supabase_client.table("cards").select("*, businesses(*)")
            if status:
                query = query.eq("status", status)
            if nfc_status:
                query = query.eq("nfc_status", nfc_status)
            if search:
                query = query.ilike("card_code", f"%{search}%")
            res = query.order("card_code").execute()
            return res.data or []
        else:
            conn = self._get_sqlite_connection()
            cur = conn.cursor()
            sql = """
                SELECT c.*, 
                       b.business_name, b.category, b.contact_name, b.phone, b.email, b.address, b.google_review_url, b.notes as business_notes,
                       (SELECT COUNT(*) FROM scan_events se WHERE se.card_id = c.id) as scan_count
                FROM cards c
                LEFT JOIN businesses b ON c.business_id = b.id
                WHERE 1=1
            """
            params = []
            if status:
                sql += " AND c.status = ?"
                params.append(status)
            if nfc_status:
                sql += " AND c.nfc_status = ?"
                params.append(nfc_status)
            if search:
                sql += " AND (c.card_code LIKE ? OR b.business_name LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])
            sql += " ORDER BY c.card_code ASC"

            cur.execute(sql, params)
            rows = [dict(row) for row in cur.fetchall()]
            conn.close()

            # Format row with nested business object for frontend consistency
            for r in rows:
                if r.get("business_id"):
                    r["business"] = {
                        "id": r["business_id"],
                        "business_name": r.get("business_name"),
                        "category": r.get("category"),
                        "contact_name": r.get("contact_name"),
                        "phone": r.get("phone"),
                        "email": r.get("email"),
                        "address": r.get("address"),
                        "google_review_url": r.get("google_review_url"),
                        "notes": r.get("business_notes")
                    }
                else:
                    r["business"] = None
            return rows

    def get_card_by_id(self, card_id: str) -> Optional[Dict[str, Any]]:
        cards = self.get_cards()
        for c in cards:
            if c["id"] == card_id:
                return c
        return None

    def get_card_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        if self.use_supabase:
            res = self.supabase_client.table("cards").select("*, businesses(*)").eq("slug", slug).execute()
            return res.data[0] if res.data else None
        else:
            conn = self._get_sqlite_connection()
            cur = conn.cursor()
            cur.execute("""
                SELECT c.*, b.business_name, b.category, b.contact_name, b.phone, b.email, b.address, b.google_review_url, b.notes as business_notes
                FROM cards c
                LEFT JOIN businesses b ON c.business_id = b.id
                WHERE c.slug = ? OR c.card_code = ?
            """, (slug, slug))
            row = cur.fetchone()
            conn.close()
            if not row:
                return None
            data = dict(row)
            if data.get("business_id"):
                data["business"] = {
                    "id": data["business_id"],
                    "business_name": data.get("business_name"),
                    "category": data.get("category"),
                    "contact_name": data.get("contact_name"),
                    "phone": data.get("phone"),
                    "email": data.get("email"),
                    "address": data.get("address"),
                    "google_review_url": data.get("google_review_url"),
                    "notes": data.get("business_notes")
                }
            else:
                data["business"] = None
            return data

    def update_card(self, card_id: str, fields: Dict[str, Any]) -> bool:
        """Safely updates non-assignment fields (e.g. qr_image_path, nfc_status)."""
        # Guard against changing permanent keys
        forbidden = ["id", "card_code", "slug", "redirect_url"]
        clean_fields = {k: v for k, v in fields.items() if k not in forbidden}
        if not clean_fields:
            return True

        if self.use_supabase:
            self.supabase_client.table("cards").update(clean_fields).eq("id", card_id).execute()
            return True
        else:
            conn = self._get_sqlite_connection()
            with conn:
                set_clauses = [f"{k} = ?" for k in clean_fields.keys()]
                vals = list(clean_fields.values()) + [card_id]
                conn.execute(f"UPDATE cards SET {', '.join(set_clauses)} WHERE id = ?", vals)
            conn.close()
            return True

    def update_redirect_base_url(self, new_base_url: str) -> int:
        """
        Updates the redirect base URL for all cards in inventory.
        Used when configuring local Wi-Fi testing (e.g. http://192.168.x.x:5000)
        or final production domain before manufacturing.
        """
        new_base_url = new_base_url.rstrip("/")
        cards = self.get_cards()
        count = 0
        if self.use_supabase:
            for c in cards:
                new_url = f"{new_base_url}/r/{c['card_code']}"
                self.supabase_client.table("cards").update({"redirect_url": new_url}).eq("id", c["id"]).execute()
                count += 1
        else:
            conn = self._get_sqlite_connection()
            with conn:
                for c in cards:
                    new_url = f"{new_base_url}/r/{c['card_code']}"
                    conn.execute("UPDATE cards SET redirect_url = ? WHERE id = ?", (new_url, c["id"]))
                    count += 1
            conn.close()

        self.log_admin_action("UPDATE_BASE_URL", None, None, f"Updated redirect base domain to {new_base_url} across {count} cards")
        return count


    # ----------------------------------------------------
    # BUSINESSES OPERATIONS
    # ----------------------------------------------------
    def get_businesses(self, search: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.use_supabase:
            query = self.supabase_client.table("businesses").select("*, cards(*)")
            if search:
                query = query.ilike("business_name", f"%{search}%")
            if category:
                query = query.eq("category", category)
            res = query.order("created_at", desc=True).execute()
            return res.data or []
        else:
            conn = self._get_sqlite_connection()
            cur = conn.cursor()
            sql = """
                SELECT b.*, c.id as card_id, c.card_code, c.status as card_status, c.activated_at,
                       (SELECT COUNT(*) FROM scan_events se WHERE se.card_id = c.id) as total_scans
                FROM businesses b
                LEFT JOIN cards c ON c.business_id = b.id
                WHERE 1=1
            """
            params = []
            if search:
                sql += " AND (b.business_name LIKE ? OR b.contact_name LIKE ? OR b.phone LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            if category:
                sql += " AND b.category = ?"
                params.append(category)
            sql += " ORDER BY b.created_at DESC"

            cur.execute(sql, params)
            rows = [dict(r) for r in cur.fetchall()]
            conn.close()
            return rows

    def get_business_by_id(self, business_id: str) -> Optional[Dict[str, Any]]:
        businesses = self.get_businesses()
        for b in businesses:
            if b["id"] == business_id:
                return b
        return None

    def update_business(self, business_id: str, fields: Dict[str, Any]) -> bool:
        """
        Updates business information (name, contact, phone, review url, etc.).
        Note: Cannot change assigned card_id.
        """
        # Ensure immutable fields are protected
        forbidden = ["id", "created_at"]
        clean_fields = {k: v for k, v in fields.items() if k not in forbidden}
        clean_fields["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if self.use_supabase:
            self.supabase_client.table("businesses").update(clean_fields).eq("id", business_id).execute()
            self.log_admin_action("UPDATE_BUSINESS", None, business_id, f"Updated business details for business {business_id}")
            return True
        else:
            conn = self._get_sqlite_connection()
            with conn:
                set_clauses = [f"{k} = ?" for k in clean_fields.keys()]
                vals = list(clean_fields.values()) + [business_id]
                conn.execute(f"UPDATE businesses SET {', '.join(set_clauses)} WHERE id = ?", vals)
            conn.close()
            self.log_admin_action("UPDATE_BUSINESS", None, business_id, f"Updated business details for business {business_id}")
            return True

    # ----------------------------------------------------
    # CARD ACTIVATION WORKFLOW (ATOMIC & PERMANENT)
    # ----------------------------------------------------
    def activate_card(self, card_id: str, business_payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Performs atomic permanent assignment:
        1. Verifies card exists and is currently AVAILABLE.
        2. Creates business record.
        3. Updates card: business_id = new_id, status = ACTIVATED, activated_at = now.
        4. Logs action.
        Throws ValueError on duplicate or invalid assignment.
        """
        card = self.get_card_by_id(card_id)
        if not card:
            raise ValueError(f"Card {card_id} not found.")
        if card["status"] != "AVAILABLE" or card.get("business_id"):
            raise ValueError(f"Card {card['card_code']} is already assigned or not in AVAILABLE status.")

        business_id = str(uuid.uuid4())
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        new_business = {
            "id": business_id,
            "business_name": business_payload["business_name"].strip(),
            "category": business_payload.get("category", "").strip(),
            "contact_name": business_payload.get("contact_name", "").strip(),
            "phone": business_payload.get("phone", "").strip(),
            "email": business_payload.get("email", "").strip(),
            "address": business_payload.get("address", "").strip(),
            "google_review_url": business_payload["google_review_url"].strip(),
            "notes": business_payload.get("notes", "").strip(),
            "created_at": now_iso,
            "updated_at": now_iso
        }

        if self.use_supabase:
            # Transaction / atomic insertion
            b_res = self.supabase_client.table("businesses").insert(new_business).execute()
            if not b_res.data:
                raise RuntimeError("Failed to create business record.")

            # Update card
            c_res = self.supabase_client.table("cards").update({
                "status": "ACTIVATED",
                "business_id": business_id,
                "activated_at": now_iso
            }).eq("id", card_id).eq("status", "AVAILABLE").execute()

            if not c_res.data:
                # Rollback business
                self.supabase_client.table("businesses").delete().eq("id", business_id).execute()
                raise ValueError("Concurrency error: Card was activated by another request.")
        else:
            conn = self._get_sqlite_connection()
            try:
                with conn:
                    # Insert business
                    conn.execute("""
                        INSERT INTO businesses (id, business_name, category, contact_name, phone, email, address, google_review_url, notes, created_at, updated_at)
                        VALUES (:id, :business_name, :category, :contact_name, :phone, :email, :address, :google_review_url, :notes, :created_at, :updated_at)
                    """, new_business)

                    # Update card atomically with status check
                    cursor = conn.execute("""
                        UPDATE cards 
                        SET status = 'ACTIVATED', business_id = ?, activated_at = ?
                        WHERE id = ? AND status = 'AVAILABLE'
                    """, (business_id, now_iso, card_id))

                    if cursor.rowcount == 0:
                        raise ValueError(f"Card {card['card_code']} could not be activated. Status changed concurrently.")
            finally:
                conn.close()

        self.log_admin_action("ACTIVATE_CARD", card_id, business_id, f"Card {card['card_code']} activated permanently for {new_business['business_name']}")
        return {
            "card_id": card_id,
            "card_code": card["card_code"],
            "business_id": business_id,
            "business_name": new_business["business_name"],
            "redirect_url": card["redirect_url"],
            "google_review_url": new_business["google_review_url"],
            "status": "ACTIVATED"
        }

    def deactivate_card(self, card_id: str, reason: str = "") -> bool:
        """
        Deactivates an activated card.
        The card remains permanently assigned to its original business.
        """
        card = self.get_card_by_id(card_id)
        if not card:
            raise ValueError(f"Card {card_id} not found.")
        if card["status"] != "ACTIVATED":
            raise ValueError(f"Card {card['card_code']} is not in ACTIVATED status (current: {card['status']}).")

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if self.use_supabase:
            self.supabase_client.table("cards").update({
                "status": "DEACTIVATED",
                "deactivated_at": now_iso
            }).eq("id", card_id).execute()
        else:
            conn = self._get_sqlite_connection()
            with conn:
                conn.execute("""
                    UPDATE cards 
                    SET status = 'DEACTIVATED', deactivated_at = ?
                    WHERE id = ?
                """, (now_iso, card_id))
            conn.close()

        self.log_admin_action("DEACTIVATE_CARD", card_id, card.get("business_id"), f"Card {card['card_code']} deactivated. Reason: {reason or 'Not specified'}")
        return True

    def reactivate_card(self, card_id: str) -> bool:
        """
        Reactivates a deactivated card for its original business.
        Cannot be reactivated for any other business.
        """
        card = self.get_card_by_id(card_id)
        if not card:
            raise ValueError(f"Card {card_id} not found.")
        if card["status"] != "DEACTIVATED":
            raise ValueError(f"Card {card['card_code']} is not in DEACTIVATED status.")
        if not card.get("business_id"):
            raise ValueError(f"Card {card['card_code']} has no permanent business assignment.")

        if self.use_supabase:
            self.supabase_client.table("cards").update({
                "status": "ACTIVATED",
                "deactivated_at": None
            }).eq("id", card_id).execute()
        else:
            conn = self._get_sqlite_connection()
            with conn:
                conn.execute("""
                    UPDATE cards 
                    SET status = 'ACTIVATED', deactivated_at = NULL
                    WHERE id = ?
                """, (card_id,))
            conn.close()

        self.log_admin_action("REACTIVATE_CARD", card_id, card.get("business_id"), f"Card {card['card_code']} reactivated for original business")
        return True

    # ----------------------------------------------------
    # REDIRECT & SCAN EVENTS
    # ----------------------------------------------------
    def record_scan_event(self, card_id: str, user_agent: Optional[str] = None, referrer: Optional[str] = None, source: str = "QR/NFC", ip_hash: Optional[str] = None):
        """Records scan event for analytics."""
        event_id = str(uuid.uuid4())
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if self.use_supabase:
            self.supabase_client.table("scan_events").insert({
                "id": event_id,
                "card_id": card_id,
                "scanned_at": now_iso,
                "user_agent": (user_agent or "")[:255],
                "referrer": (referrer or "")[:255],
                "source": source,
                "ip_hash": ip_hash
            }).execute()
        else:
            conn = self._get_sqlite_connection()
            with conn:
                conn.execute("""
                    INSERT INTO scan_events (id, card_id, scanned_at, user_agent, referrer, source, ip_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (event_id, card_id, now_iso, (user_agent or "")[:255], (referrer or "")[:255], source, ip_hash))
            conn.close()

    # ----------------------------------------------------
    # AUDIT LOGS
    # ----------------------------------------------------
    def log_admin_action(self, action: str, card_id: Optional[str], business_id: Optional[str], description: str, admin_user_id: Optional[str] = None):
        log_id = str(uuid.uuid4())
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if self.use_supabase:
            try:
                self.supabase_client.table("admin_logs").insert({
                    "id": log_id,
                    "action": action,
                    "card_id": card_id,
                    "business_id": business_id,
                    "description": description,
                    "created_at": now_iso,
                    "admin_user_id": admin_user_id or "admin"
                }).execute()
            except Exception as e:
                print(f"[DB] Log error: {e}")
        else:
            try:
                conn = self._get_sqlite_connection()
                with conn:
                    conn.execute("""
                        INSERT INTO admin_logs (id, action, card_id, business_id, description, created_at, admin_user_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (log_id, action, card_id, business_id, description, now_iso, admin_user_id or "admin"))
                conn.close()
            except Exception as e:
                print(f"[DB] Log error: {e}")

    def get_admin_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        if self.use_supabase:
            res = self.supabase_client.table("admin_logs").select("*").order("created_at", desc=True).limit(limit).execute()
            return res.data or []
        else:
            conn = self._get_sqlite_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = [dict(r) for r in cur.fetchall()]
            conn.close()
            return rows

    # ----------------------------------------------------
    # ANALYTICS QUERIES
    # ----------------------------------------------------
    def get_overview_metrics(self) -> Dict[str, Any]:
        """Calculates real metrics from the database."""
        cards = self.get_cards()
        businesses = self.get_businesses()

        total_cards = len(cards)
        available_cards = sum(1 for c in cards if c["status"] == "AVAILABLE")
        activated_cards = sum(1 for c in cards if c["status"] == "ACTIVATED")
        deactivated_cards = sum(1 for c in cards if c["status"] == "DEACTIVATED")
        total_businesses = len(businesses)

        # Scans
        total_scans = 0
        recent_scans = []
        if self.use_supabase:
            scans_res = self.supabase_client.table("scan_events").select("id, scanned_at, card_id, source").order("scanned_at", desc=True).limit(10).execute()
            recent_scans = scans_res.data or []
            count_res = self.supabase_client.table("scan_events").select("id", count="exact").execute()
            total_scans = count_res.count or len(recent_scans)
        else:
            conn = self._get_sqlite_connection()
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) as count FROM scan_events")
            total_scans = cur.fetchone()["count"]

            cur.execute("""
                SELECT se.id, se.scanned_at, se.card_id, se.source, c.card_code, b.business_name
                FROM scan_events se
                JOIN cards c ON se.card_id = c.id
                LEFT JOIN businesses b ON c.business_id = b.id
                ORDER BY se.scanned_at DESC LIMIT 10
            """)
            recent_scans = [dict(r) for r in cur.fetchall()]
            conn.close()

        # Recent activations
        recent_activations = [c for c in cards if c["status"] == "ACTIVATED"]
        recent_activations.sort(key=lambda x: x.get("activated_at") or "", reverse=True)
        recent_activations = recent_activations[:5]

        return {
            "total_cards": total_cards,
            "available_cards": available_cards,
            "activated_cards": activated_cards,
            "deactivated_cards": deactivated_cards,
            "total_businesses": total_businesses,
            "total_scans": total_scans,
            "recent_scans": recent_scans,
            "recent_activations": recent_activations
        }

# Global singleton database manager
db = DatabaseManager()

