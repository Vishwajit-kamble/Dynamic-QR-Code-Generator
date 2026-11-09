# TapReview — Private NFC & Dynamic QR Review Card Management Platform

TapReview is a private, single-admin web application used by a business owner to manage 50 pre-manufactured NFC Google Review cards (`TR001` through `TR050`).

The owner manufactures NFC cards in advance, visits local businesses in person, sells a ready-made card, and permanently activates it via the private admin dashboard.

---

## 🚀 Key Features

- **Private Single-Admin Dashboard**: Clean, modern SaaS interface built with React, Vite, Tailwind CSS, Lucide icons, and Recharts.
- **50-Card Pre-Manufactured Inventory**: Full tracking of `TR001` to `TR050` with status management (`AVAILABLE`, `ACTIVATED`, `DEACTIVATED`).
- **Dynamic 302 Redirection**: Physical cards encode a permanent URL (`https://yourdomain.com/r/TR001`). The backend dynamically resolves the business's current Google Review destination.
- **Permanent Card Assignment**: Once activated, a card cannot be reassigned or transferred to another business.
- **Editable Review Destinations**: The business can update its Google Review link at any time without altering physical cards.
- **NFC Programming Workflow**: Track NFC chip writing and testing status (`NOT_PROGRAMMED`, `PROGRAMMED`, `TESTED`) with step-by-step mobile instructions.
- **Print Manufacturing Suite**: Download 50 high-res (300 DPI) QR codes in a ZIP file, export CSV manufacturing manifests, and render print-production sheets.
- **Privacy-Conscious Analytics**: Track total scans, daily trends, and card leaderboards using anonymized IP hashes.
- **Dual Database Architecture**: Direct Supabase PostgreSQL support with an automatic persistent SQLite engine for instant local development and testing.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, React Router, Lucide Icons, Recharts, Axios |
| **Backend** | Python 3.10+ / 3.13, Flask, Flask-CORS, PyJWT, python-dotenv |
| **QR Engine** | Python `qrcode` (PIL / Pillow) with Error Correction Level H (300 DPI) |
| **Database** | Supabase PostgreSQL / Persistent SQLite fallback |
| **Deployment** | Vercel (Frontend), Render / Railway (Backend WSGI Gunicorn) |

---

## 📁 Project Structure

```
TapReview/
├── backend/
│   ├── app.py                      # Flask application factory & static SPA server
│   ├── config.py                   # Environment configuration & paths
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Sample environment variables
│   ├── database/
│   │   ├── supabase_client.py      # Dual database manager (Supabase / SQLite)
│   │   ├── seed_cards.py           # Seeds initial 50 inventory cards
│   │   └── migrations/
│   │       └── 001_initial_schema.sql # PostgreSQL schema & integrity triggers
│   ├── routes/
│   │   ├── auth.py                 # Admin JWT login, logout & verification
│   │   ├── cards.py                # Card CRUD, activation, deactivation & QR serving
│   │   ├── businesses.py           # Business directory & destination editing
│   │   ├── redirects.py            # Public dynamic HTTP 302 redirect route (/r/<slug>)
│   │   ├── analytics.py            # Aggregated analytics, trends & audit logs
│   │   ├── nfc.py                  # NFC chip programming workflow endpoints
│   │   └── settings.py             # App settings & CSV/JSON backup exports
│   ├── services/
│   │   ├── qr_service.py           # Print-ready QR generation, ZIP archives & manifests
│   │   ├── card_service.py         # Card business logic wrapper
│   │   ├── redirect_service.py     # Dynamic resolution & scan logging
│   │   └── analytics_service.py    # Metric aggregation
│   └── tests/
│       └── test_tapreview.py       # 11-test integration & business rule test suite
│
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI widgets
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication state & persistent JWT storage
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx # Collapsible responsive sidebar & navigation
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Clean admin login page
│   │   │   ├── Overview.jsx        # 6 KPI cards, trend charts & recent activity
│   │   │   ├── Inventory.jsx       # 50-card searchable table, details modal & actions
│   │   │   ├── Businesses.jsx      # Directory, contact info & review link editor
│   │   │   ├── ActivateCard.jsx    # Guided 4-step permanent card activation wizard
│   │   │   ├── QRManagement.jsx    # QR previews, ZIP download, manifest & print sheet
│   │   │   ├── Analytics.jsx       # Recharts visualizations & admin audit trail
│   │   │   └── Settings.jsx        # Domain configs, database status & backup exports
│   │   ├── services/
│   │   │   └── api.js              # Axios client with automatic Bearer token
│   │   ├── App.jsx                 # Routing & protected route guards
│   │   └── index.css               # Tailwind CSS directives
│   ├── package.json
│   └── vite.config.js              # Vite bundler with API/Redirect reverse proxy
│
├── qr_codes/                       # 50 pre-generated high-res print QR images (TR001 - TR050)
├── docs/
│   └── deployment.md               # Complete production setup guide
├── plan.md                         # Detailed project specification blueprint
├── prompt.txt                      # Implementation instructions & business constraints
└── README.md
```

---

## 🚦 Quickstart Guide (Local Development)

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# 1. Install backend dependencies
pip install -r backend/requirements.txt

# 2. Seed initial 50 cards (TR001 to TR050)
python backend/database/seed_cards.py

# 3. Start the backend server
python backend/app.py
```
*Backend runs on `http://localhost:5000`.*

Default Admin Login:
- **Email**: `admin@tapreview.com`
- **Password**: `AdminTapReview2026!`

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

Alternatively, the built frontend is automatically served directly by Flask at `http://localhost:5000`!

---

## 🧪 Running Automated Tests

Run the test suite verifying all 16 business rules and API endpoints:
```bash
python backend/tests/test_tapreview.py
```

### Verified Test Cases:
1. Health check & database connection
2. Admin authentication & route protection
3. 50-card inventory uniqueness (`TR001` - `TR050`)
4. In-person card activation workflow (Restaurant A)
5. Dynamic HTTP 302 redirection to Google Review destination
6. Permanent assignment safeguard (rejects reassigning `TR001` to Salon B)
7. Updating review destination without altering physical QR/NFC code
8. Deactivation (returns inactive notice) & Reactivation (restores redirect)
9. Unassigned card redirect behavior (returns not-activated notice)
10. Unknown card slug handling (HTTP 404)
11. QR image serving, NFC URL consistency, and analytics event logging

---

## 🔒 Mandatory Business Rules Enforced

1. **Exact 50 Card Inventory**: `TR001` through `TR050`.
2. **Permanent Assignment**: Once activated, a card cannot be reassigned to any other business.
3. **No Deletion**: Physical cards are already manufactured; records cannot be deleted.
4. **Editable Review Destination**: Business review destination can be updated at any time without changing physical cards.
5. **Reactivation Guard**: Deactivated cards can only be reactivated for their original assigned business.
6. **Identical QR & NFC URLs**: Both point to `https://yourdomain.com/r/<card_code>`.
7. **No Open Redirects**: Destinations are strictly retrieved from trusted database records, never from query parameters.

