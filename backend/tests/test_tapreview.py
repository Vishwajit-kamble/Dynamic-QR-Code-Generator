import sys
from pathlib import Path
import unittest
import os

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.config import Config

# Point to an isolated test database
test_db_path = Config.BASE_DIR / "database" / "test_tapreview.db"
if test_db_path.exists():
    try:
        os.remove(test_db_path)
    except Exception:
        pass

Config.SQLITE_DB_PATH = test_db_path

from backend.database.supabase_client import DatabaseManager
import backend.database.supabase_client as s_client
s_client.db = DatabaseManager()
from backend.database.supabase_client import db

from backend.app import app

class TapReviewComprehensiveTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        # Seed 50 cards
        db.seed_initial_cards(50, Config.PUBLIC_REDIRECT_BASE_URL)

        # Login to obtain admin token
        res_login = cls.client.post("/api/auth/login", json={
            "email": Config.ADMIN_EMAIL,
            "password": Config.ADMIN_PASSWORD
        })
        login_data = res_login.get_json()
        cls.token = login_data["token"]
        cls.auth_headers = {"Authorization": f"Bearer {login_data['token']}"}

    def test_01_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertGreaterEqual(data["cards_in_inventory"], 50)

    def test_02_auth_protection(self):
        # Protected endpoints must reject unauthenticated requests
        res = self.client.get("/api/cards")
        self.assertEqual(res.status_code, 401)

        # Login failure
        res_fail = self.client.post("/api/auth/login", json={
            "email": Config.ADMIN_EMAIL,
            "password": "WrongPassword123"
        })
        self.assertEqual(res_fail.status_code, 401)

    def test_03_inventory_50_cards(self):
        res = self.client.get("/api/cards", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["count"], 50)
        cards = data["cards"]
        self.assertEqual(cards[0]["card_code"], "TR001")
        self.assertEqual(cards[-1]["card_code"], "TR050")

    def test_04_card_activation_workflow(self):
        # Get TR001 card
        tr001 = db.get_card_by_slug("TR001")
        self.assertIsNotNone(tr001)
        self.assertEqual(tr001["status"], "AVAILABLE")

        # Activate TR001 for Restaurant A
        res_act = self.client.post("/api/cards/activate", headers=self.auth_headers, json={
            "card_id": tr001["id"],
            "business_name": "Restaurant A",
            "category": "Dining",
            "contact_name": "Chef Mario",
            "phone": "+91 9876543210",
            "email": "mario@rest-a.com",
            "address": "123 Food Street",
            "google_review_url": "https://g.page/r/restaurant-a-reviews/review",
            "notes": "Counter NFC card"
        })
        self.assertEqual(res_act.status_code, 200)
        act_data = res_act.get_json()
        self.assertTrue(act_data["success"])
        self.assertEqual(act_data["data"]["business_name"], "Restaurant A")
        TapReviewComprehensiveTestSuite.restaurant_a_id = act_data["data"]["business_id"]

        # Verify TR001 is now ACTIVATED
        tr001_updated = db.get_card_by_slug("TR001")
        self.assertEqual(tr001_updated["status"], "ACTIVATED")

        # Test dynamic redirect
        res_redir = self.client.get("/r/TR001", follow_redirects=False)
        self.assertEqual(res_redir.status_code, 302)
        self.assertEqual(res_redir.headers["Location"], "https://g.page/r/restaurant-a-reviews/review")

    def test_05_permanent_assignment_safeguard(self):
        # Attempting to activate TR001 for Salon B must be rejected!
        tr001 = db.get_card_by_slug("TR001")
        res_fail = self.client.post("/api/cards/activate", headers=self.auth_headers, json={
            "card_id": tr001["id"],
            "business_name": "Salon B",
            "category": "Beauty",
            "google_review_url": "https://g.page/r/salon-b-reviews/review"
        })
        self.assertEqual(res_fail.status_code, 400)
        self.assertIn("already assigned", res_fail.get_json()["error"])

    def test_06_update_review_destination(self):
        # Ensure TR001 is activated
        tr001 = db.get_card_by_slug("TR001")
        if tr001["status"] != "ACTIVATED":
            act_res = self.client.post("/api/cards/activate", headers=self.auth_headers, json={
                "card_id": tr001["id"],
                "business_name": "Restaurant A",
                "google_review_url": "https://g.page/r/restaurant-a-reviews/review"
            })
            b_id = act_res.get_json()["data"]["business_id"]
        else:
            b_id = tr001["business_id"]

        # Update Restaurant A's Google Review link
        new_url = "https://g.page/r/restaurant-a-NEW-link/review"
        res_upd = self.client.put(f"/api/businesses/{b_id}", headers=self.auth_headers, json={
            "google_review_url": new_url
        })
        self.assertEqual(res_upd.status_code, 200)

        # Scanning the same card TR001 must now redirect to the new destination!
        res_redir = self.client.get("/r/TR001", follow_redirects=False)
        self.assertEqual(res_redir.status_code, 302)
        self.assertEqual(res_redir.headers["Location"], new_url)

    def test_07_deactivation_and_reactivation(self):
        tr001 = db.get_card_by_slug("TR001")
        # Deactivate TR001
        res_deact = self.client.post(f"/api/cards/{tr001['id']}/deactivate", headers=self.auth_headers, json={
            "reason": "Temporary renovation"
        })
        self.assertEqual(res_deact.status_code, 200)

        # Deactivated card must not redirect!
        res_redir = self.client.get("/r/TR001", follow_redirects=False)
        self.assertEqual(res_redir.status_code, 200)
        self.assertIn("Card Currently Inactive", res_redir.get_data(as_text=True))

        # Reactivate TR001
        res_react = self.client.post(f"/api/cards/{tr001['id']}/reactivate", headers=self.auth_headers)
        self.assertEqual(res_react.status_code, 200)

        # Restores redirect
        res_redir2 = self.client.get("/r/TR001", follow_redirects=False)
        self.assertEqual(res_redir2.status_code, 302)

    def test_08_available_card_redirect_behavior(self):
        # TR002 is available (unassigned)
        res = self.client.get("/r/TR002")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Card Not Activated Yet", res.get_data(as_text=True))

    def test_09_unknown_card_slug(self):
        res = self.client.get("/r/UNKNOWN999")
        self.assertEqual(res.status_code, 404)
        self.assertIn("Card Not Found", res.get_data(as_text=True))

    def test_10_qr_and_nfc_endpoints(self):
        tr001 = db.get_card_by_slug("TR001")
        # QR image
        res_qr = self.client.get(f"/api/cards/{tr001['id']}/qr")
        self.assertEqual(res_qr.status_code, 200)
        self.assertEqual(res_qr.mimetype, "image/png")

        # NFC details
        res_nfc = self.client.get(f"/api/cards/{tr001['id']}/nfc", headers=self.auth_headers)
        self.assertEqual(res_nfc.status_code, 200)
        nfc_data = res_nfc.get_json()
        self.assertEqual(nfc_data["nfc_url"], tr001["redirect_url"])

        # Update NFC status
        res_nfc_upd = self.client.post(f"/api/cards/{tr001['id']}/nfc-status", headers=self.auth_headers, json={
            "nfc_status": "PROGRAMMED"
        })
        self.assertEqual(res_nfc_upd.status_code, 200)

    def test_11_analytics_and_overview(self):
        res_overview = self.client.get("/api/analytics/overview", headers=self.auth_headers)
        self.assertEqual(res_overview.status_code, 200)
        data = res_overview.get_json()["data"]
        self.assertEqual(data["total_cards"], 50)
        self.assertGreaterEqual(data["total_scans"], 1)

if __name__ == "__main__":
    unittest.main()
