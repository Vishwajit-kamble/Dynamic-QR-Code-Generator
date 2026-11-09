TapReview --- Product & Development Plan
Project: TapReview
Product type: Private, single-admin NFC and dynamic QR review-card
management app
Initial inventory: 50 pre-manufactured cards
Primary use: The owner visits businesses in person, sells a
ready-made card, and activates it through a private admin app.
Version: 1.0
Status: Development blueprint
1. Product vision
TapReview lets its owner manage preprinted NFC Google Review cards from
one private web application.

Each physical card is manufactured with: - A unique printed QR code. -
An NFC chip containing the same unique TapReview redirect URL. - A
permanent card ID, such as TR001.

The owner carries ready-made cards while visiting local businesses. When
a business purchases a card, the owner selects an available card in
TapReview, enters the business details and its Google review link, and
activates the card.

When a customer scans the QR code or taps the NFC chip, the card's
permanent TapReview URL looks up the current destination in the database
and redirects to that business's Google review page.

The business owner does not use the web app. There are no business-owner
accounts, subscriptions, customer dashboards, or customer-facing
card-management tools.
2. Confirmed business rules
These rules are mandatory and must be enforced in the backend and
database, not only in the user interface.
1. Initial inventory contains exactly 50 cards: TR001 through
   TR050.
2. Every physical card has a unique, permanent card ID and redirect
   URL.
3. The printed QR code and NFC chip on the same card contain exactly
   the same URL.
4. Card IDs, slugs, and redirect URLs cannot be changed after
   production.
5. An available card can be assigned to one business.
6. Once activated, a card is permanently assigned to that business.
7. An activated card cannot be reassigned, transferred, or deleted.
8. The assigned business's Google review destination can be updated
   later.
9. A card can be deactivated. A deactivated card remains assigned to
   its original business.
10. A deactivated card can only be reactivated for its original
    business.
11. An available or deactivated card must not redirect to a review
    destination.
12. Only the authenticated administrator can manage inventory,
    businesses, activation, destinations, and analytics.
13. Public redirect requests expose only the minimum information needed
    to redirect.
14. Do not generate, submit, filter, or fabricate reviews. Customers
    must independently choose whether to leave an honest review.
15. Do not claim QR-versus-NFC scan source when both use the exact same
    URL. The request cannot reliably distinguish the two.
3. Goals and non-goals
Goals
- Provide a secure, mobile-friendly private admin dashboard.
- Track all 50 physical cards and their manufacturing readiness.
- Generate unique QR codes for the final production domain.
- Export individual QR images, a ZIP archive, a CSV manifest, and a
  print-production sheet.
- Track whether each NFC chip has been programmed and tested.
- Add and manage business records.
- Activate an available card with a business and Google review URL.
- Permanently lock an activated card to its original business.
- Redirect QR and NFC visits dynamically.
- Allow the original business's review URL to be updated without
  changing the physical card.
- Record privacy-conscious scan events and show useful analytics.
- Provide backups, audit logs, tests, and deployment instructions.
Non-goals for version 1
- Business-owner logins or dashboards.
- Public self-service registration.
- Subscription billing or payments.
- Direct NFC writing from the web app.
- Automatic Google review submission.
- Review sentiment analysis or review generation.
- QR/NFC source attribution when both use the same URL.
- Reassigning or reselling an activated card to another business.
4. Users and permissions
Administrator
There is one authorized administrator: the TapReview owner.

The administrator can: - Log in and log out. - View dashboard metrics. -
View and search inventory. - Add and edit business information. -
Activate available cards. - Update the review destination for the
original assigned business. - Deactivate and reactivate a card for its
original business. - View scan analytics and audit history. - Export
records and backups. - Manage permitted application settings.
Public visitor
A public visitor is someone scanning a QR code or tapping an NFC card.

The visitor can: - Request a card redirect URL. - Be redirected to the
assigned business's saved review destination if the card is active.

The visitor cannot: - View the admin dashboard. - View business records
or scan analytics. - Activate or edit cards. - Access administrative API
endpoints.
5. Recommended technology
  Layer                   Technology              Responsibility
  Frontend                React + Vite            Admin user interface

  Styling                 Tailwind CSS            Responsive visual
design

  Routing                 React Router            Protected admin pages

  Icons                   Lucide React            Consistent interface
icons

  HTTP client             Axios                   Frontend/backend
requests

  Charts                  Recharts                Dashboard analytics

  Backend                 Python 3.13 + Flask     API and redirect
service

  Database                Supabase PostgreSQL     Persistent application
data

  QR generation           Python qrcode +       QR images
Pillow                  

  Validation              Pydantic or equivalent  Request validation

  Authentication          Supabase Auth or        Admin access
securely implemented
server-side
authentication          

  Production frontend     Vercel or equivalent    Static frontend hosting

  Production backend      Render or equivalent    Flask hosting
Production domain       Custom domain           Stable public redirect
URLs
Use a production WSGI server such as Gunicorn. Do not use Flask's
development server in production.

Keep secrets on the backend. Never put a Supabase service-role key or
other privileged secret in frontend environment variables.
6. System architecture
Main components
1. Admin frontend: The private interface used by the owner.
2. Flask API: Authenticated business and inventory operations.
3. Public redirect route: Resolves a card slug and redirects to its
   current approved destination.
4. Supabase PostgreSQL: Stores cards, businesses, scan events, and
   audit logs.
5. QR production utility: Generates the permanent QR images and
   manufacturing manifest.
6. NFC programming workflow: The owner copies the matching URL into
   an NFC writing app and records programming/test status in TapReview.
Redirect flow
1. A visitor scans the printed QR code or taps the NFC chip.
2. The phone requests https://YOUR_DOMAIN/r/TR001.
3. Flask receives the public redirect request.
4. The backend looks up TR001 in the database.
5. The backend verifies that the card is active and assigned.
6. The backend retrieves the Google review URL saved for the assigned
   business.
7. A scan event is recorded.
8. Flask responds with an HTTP 302 redirect to the saved destination.
The destination must come from the database. Never accept an arbitrary
destination URL from a query parameter.
Important URL distinction
The physical QR/NFC URL is permanent. The business review destination is
editable.

Example:
- Permanent card URL: https://YOUR_DOMAIN/r/TR001
- Current destination: Restaurant A's Google review link
- Later destination for the same business: Restaurant A's updated
  Google review link
Updating the business destination must not change the physical QR code
or NFC record.
7. Application navigation and pages
7.1 Login
- Brand mark and TapReview name.
- Email and password fields.
- Show/hide password.
- Form validation.
- Loading and error states.
- Secure session handling.
- Logout action.
No public registration page is required. Provision the administrator
securely through the chosen authentication provider or a controlled
setup process.
7.2 Overview dashboard
Show real values from the database: - Total cards. - Available cards. -
Activated cards. - Deactivated cards. - Total businesses. - Total scans
for the selected date range.

Additional sections: - Recent activations. - Recent scans. - Most
scanned cards. - Daily or monthly scan trend. - Inventory utilization. -
Quick action to activate a card.

Do not hardcode sample metrics in production. Display useful empty
states when there is no data.
7.3 Card inventory
Show a searchable, filterable, paginated table containing: - Card ID. -
Status. - Business name, if assigned. - QR URL. - QR production
status. - NFC programming status. - Created date. - Activation date. -
Scan count.

Filters: - Available. - Activated. - Deactivated. - NFC not
programmed. - NFC programmed. - NFC tested.

Actions depend on status. Available cards may be activated. Activated
cards may be viewed and managed for their original business. Deactivated
cards remain permanently assigned.
7.4 Card details
Show: - Card ID and permanent slug. - Permanent redirect URL. - QR
preview and download. - Assigned business, if any. - Current review
destination, if active. - QR production status. - NFC programming status
and dates. - Activation/deactivation history. - Scan summary. - Audit
history.
7.5 Businesses
Show a searchable list of businesses with: - Business name. -
Category. - Contact name. - Phone. - Email, if provided. - Address, if
provided. - Assigned card ID. - Current status. - Activation date. -
Scan count.

Allow editing business contact details and the review URL. Do not allow
changing the card assignment.
7.6 Activate card
Use a guided workflow:

Step 1 --- Select card - List only cards with status AVAILABLE. -
Show card ID and QR preview. - Do not allow selecting an already
assigned card.

Step 2 --- Enter business details - Business name (required). -
Business category (optional or required according to final form
design). - Contact name (optional). - Phone (optional). - Email
(optional). - Address (optional). - Notes (optional).

Step 3 --- Enter review destination - Google review URL
(required). - Require HTTPS. - Validate URL syntax. - Reject unsafe
schemes such as javascript:, data:, and file:. - Do not assume
that every HTTPS URL is a valid Google review link; show a clear
validation warning if the host or format looks unexpected.

Step 4 --- Review and confirm Show card ID, business name, and
destination. Explain that activation permanently assigns the card.

Step 5 --- Activate Perform one atomic server-side operation: -
Create the business record. - Assign the card to that business. - Set
status to ACTIVATED. - Save activation timestamp. - Add an audit log
entry.

If any part fails, roll back the entire operation. Prevent double
submission and concurrent assignment.

After success, show the card ID, business name, permanent redirect URL,
NFC URL, and a test redirect action.
7.7 QR management and manufacturing
Before generating production QR codes: - Confirm the final public domain
is configured. - Confirm HTTPS works. - Confirm all 50 slugs exist in
the database. - Confirm each slug resolves to the correct card record.

Generate: - TR001.png through TR050.png. - Individual downloads. -
ZIP archive containing all 50 QR images. - CSV manifest with card ID and
permanent redirect URL. - Print-production sheet with clear card labels
and QR images.

QR print requirements: - High error correction. - Black modules on a
white background. - Adequate quiet zone. - Square proportions; never
stretch. - High-resolution output suitable for print. - Verify final
physical QR size and contrast with test prints. - Do not add a logo
inside the QR unless it has been tested successfully.

Once cards are printed, card ID, slug, and redirect URL are immutable.
Do not offer a production feature that silently regenerates a printed
card with a different URL.
7.8 NFC management
The app does not directly write NFC hardware in version 1.

For each card: - Display the exact permanent redirect URL. - Provide a
copy button. - Show NFC status: NOT_PROGRAMMED, PROGRAMMED, or
TESTED. - Allow the administrator to update status. - Record
programming and test timestamps. - Provide a short NFC Tools instruction
panel.

The owner writes the URL to the chip using a compatible NFC writing
application. The URL must exactly match the QR URL for that card.
7.9 Analytics
Show: - Total scans. - Scans by card. - Scans by business. - Daily,
weekly, and monthly trends. - Most scanned cards. - Recent scan events.

Record only information needed for operational analytics. Avoid
retaining raw IP addresses unless there is a justified, disclosed need.
Prefer short-lived or anonymized identifiers and configurable retention.

Because QR and NFC contain the same URL, do not claim to distinguish QR
scans from NFC taps.
7.10 Settings and exports
Settings: - App name. - Public redirect base URL. - Timezone:
Asia/Kolkata. - Admin account information. - QR defaults. - Analytics
retention settings.

Exports: - Card inventory CSV. - Business records CSV. - Scan analytics
CSV. - Audit logs CSV. - Backup JSON.

Backups must not expose passwords, authentication tokens, or secrets.
8. Database design
Use UUID primary keys, foreign keys, indexes, timestamps, constraints,
and appropriate row-level security.
cards
Suggested fields: - id UUID primary key. - card_code text unique,
e.g. TR001. - slug text unique, e.g. TR001. - redirect_url text
unique. - status text constrained to AVAILABLE, ACTIVATED,
DEACTIVATED. - business_id UUID nullable foreign key to
businesses. - qr_image_path text nullable. - qr_production_status
text. - nfc_status text constrained to NOT_PROGRAMMED, PROGRAMMED,
TESTED. - nfc_programmed_at timestamp nullable. - nfc_tested_at
timestamp nullable. - created_at timestamp. - activated_at timestamp
nullable. - deactivated_at timestamp nullable.
businesses
Suggested fields: - id UUID primary key. - business_name text
required. - category text nullable. - contact_name text nullable. -
phone text nullable. - email text nullable. - address text
nullable. - google_review_url text required. - notes text
nullable. - created_at timestamp. - updated_at timestamp.

A business should have one assigned card in this version. Enforce
one-to-one assignment through constraints and backend transaction logic.
scan_events
Suggested fields: - id UUID primary key. - card_id UUID foreign
key. - scanned_at timestamp. - user_agent text nullable. -
referrer text nullable. - source text nullable, only when reliably
known. - privacy_safe_fingerprint text nullable, if used and properly
disclosed.
admin_logs
Suggested fields: - id UUID primary key. - action text. - card_id
UUID nullable. - business_id UUID nullable. - description text. -
created_at timestamp. - admin_user_id text or UUID, according to
auth provider.
Database safeguards
- Unique constraint on cards.card_code.
- Unique constraint on cards.slug.
- Unique constraint on cards.redirect_url.
- One-to-one business/card assignment.
- A card with a business assignment cannot return to AVAILABLE.
- A card cannot be assigned to a different business after activation.
- A business's review URL can be updated without changing card
  identifiers.
- Use a database trigger or carefully designed transaction/RPC to
  enforce immutable assignment.
- Use transactions for activation and all multi-table state changes.
- Restrict direct database access through Row Level Security.
9. API design
All admin endpoints must require authentication. The public redirect
endpoint is the deliberate exception.
Authentication
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
Dashboard
- GET /api/analytics/overview
Cards
- GET /api/cards
- GET /api/cards/available
- GET /api/cards/<card_id>
- GET /api/cards/<card_id>/qr
- GET /api/cards/download-all
- POST /api/cards/seed (restricted setup/admin operation)
Businesses
- GET /api/businesses
- POST /api/businesses only if a separate unassigned-business
  workflow is intentionally supported; otherwise create businesses
  during activation.
- GET /api/businesses/<business_id>
- PUT /api/businesses/<business_id>
Activation and status
- POST /api/cards/activate
- POST /api/cards/<card_id>/deactivate
- POST /api/cards/<card_id>/reactivate
Reactivation must verify that the card is still assigned to the same
original business.
Redirect
- GET /r/<slug>
Analytics
- GET /api/analytics/cards
- GET /api/analytics/businesses
- GET /api/analytics/trends
NFC
- GET /api/cards/<card_id>/nfc
- POST /api/cards/<card_id>/nfc-status
Use consistent JSON response formats, appropriate HTTP status codes,
input validation, and clear error messages. Do not expose stack traces
or secrets in production responses.
10. Security and privacy
- Use secure admin authentication.
- Protect every admin route in both frontend and backend.
- Never rely on frontend route protection alone.
- Keep privileged database keys on the server.
- Use HTTPS in production.
- Restrict CORS to the known frontend origin.
- Validate and normalize all input.
- Validate review destinations and allow only safe HTTPS destinations.
- Do not implement an open redirect endpoint.
- Apply rate limiting to login and public redirect routes as
  appropriate.
- Use secure cookies or a properly validated token strategy.
- Apply Supabase Row Level Security.
- Do not log secrets or authentication tokens.
- Minimize scan data collection.
- Provide a privacy notice for analytics if appropriate.
- Maintain audit logs for activation, deactivation, reactivation, and
  destination changes.
11. Error and edge-case behavior
- Unknown card slug: show a branded not-found page and return HTTP
  404.
- Available card: show a not-activated page; do not redirect.
- Deactivated card: show an inactive page; do not redirect.
- Missing business record: fail safely and alert the administrator
  through logs.
- Invalid review URL: reject the update and explain the issue.
- Database unavailable: show a friendly temporary error page; do not
  redirect to a stale or untrusted destination.
- Duplicate activation: reject without creating duplicate businesses.
- Concurrent activation: only one request may succeed.
- Network failure: show retry guidance; do not claim the operation
  succeeded.
- QR image missing: report the issue without changing the permanent
  URL.
- NFC programming failure: allow the admin to retry programming and
  testing without changing the card URL.
12. Testing plan
Create unit, integration, and end-to-end tests.
Inventory tests
- Seed exactly 50 cards.
- Confirm IDs range from TR001 to TR050.
- Confirm all card IDs, slugs, and redirect URLs are unique.
- Confirm all cards start as AVAILABLE.
QR/NFC tests
- Confirm every QR encodes the correct permanent URL.
- Confirm NFC URL shown in the app equals the QR URL.
- Confirm ZIP contains 50 correctly named images.
- Confirm CSV manifest has 50 unique records.
Activation tests
- Activate TR001 for Restaurant A.
- Confirm business and card assignment are saved atomically.
- Attempt to activate TR001 for Salon B and confirm rejection.
- Attempt two simultaneous activations and confirm only one succeeds.
- Confirm the card cannot be deleted or reassigned.
Redirect tests
- Scan/request TR001 and verify Restaurant A's destination.
- Update Restaurant A's review URL.
- Request TR001 again and verify the updated destination.
- Confirm the permanent QR/NFC URL has not changed.
- Confirm available, deactivated, and unknown cards do not redirect.
Security tests
- Confirm unauthenticated requests cannot access admin endpoints.
- Confirm public redirect reveals no business contact details.
- Confirm unsafe URL schemes are rejected.
- Confirm unauthorized users cannot change card destinations.
- Confirm service-role credentials never appear in frontend assets.
User-interface tests
- Login and logout.
- Navigate all pages.
- Search and filter inventory.
- Activate a card.
- Edit a business review destination.
- Deactivate and reactivate for the same business.
- Export files.
- Verify mobile layouts and form validation.
13. Deployment plan
Stage 1 --- Local development
- Configure environment variables.
- Run database migrations.
- Seed 50 cards.
- Run Flask and React locally.
- Test all admin and redirect flows.
Stage 2 --- Production infrastructure
- Create Supabase project.
- Deploy Flask backend.
- Deploy React frontend.
- Configure environment variables and CORS.
- Set up custom domain and HTTPS.
- Verify the public redirect route.
Stage 3 --- QR manufacturing preparation
- Confirm domain and HTTPS are stable.
- Confirm all 50 redirect URLs resolve.
- Generate QR images and manufacturing manifest.
- Print two test cards.
- Program two test NFC chips.
- Test with multiple Android and iPhone devices where available.
- Confirm QR and NFC both reach the correct business after activation.
Stage 4 --- Initial production
- Approve test print and NFC performance.
- Manufacture the remaining 48 cards.
- Verify every physical card against its manifest.
- Record NFC programming/test status.
- Begin in-person sales and activation.
Do not print all 50 cards before the final domain and redirect service
have been tested.
14. Suggested repository structure
TapReview/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── auth.py
│   │   ├── cards.py
│   │   ├── businesses.py
│   │   ├── redirects.py
│   │   ├── analytics.py
│   │   └── nfc.py
│   ├── services/
│   │   ├── qr_service.py
│   │   ├── card_service.py
│   │   ├── redirect_service.py
│   │   └── analytics_service.py
│   ├── database/
│   │   ├── supabase_client.py
│   │   ├── migrations/
│   │   └── seed_cards.py
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   └── App.jsx
│   └── package.json
├── qr_codes/
├── production_exports/
├── docs/
├── README.md
└── .gitignore
15. Development milestones and acceptance criteria
Milestone 1 --- Foundation
Deliver: - React and Flask project setup. - Environment configuration. -
Supabase connection. - Database migrations. - Login screen and protected
route foundation.

Acceptance: - Frontend loads. - Backend health check works. - Database
connection is verified. - No secrets are exposed in frontend.
Milestone 2 --- Inventory
Deliver: - 50 seeded cards. - Inventory table. - Search, filters, and
card details.

Acceptance: - Exactly 50 unique available cards are shown. - Refreshing
the app preserves data.
Milestone 3 --- QR production
Deliver: - 50 unique QR codes. - Individual download. - ZIP archive. -
CSV manifest and print sheet.

Acceptance: - All QR images encode the correct final domain URL. - QR
and NFC URL values match for every card.
Milestone 4 --- Business activation
Deliver: - Business form. - Available-card selection. - Confirmation
flow. - Atomic permanent assignment.

Acceptance: - A card can be activated once only. - Duplicate and
concurrent assignment attempts fail safely.
Milestone 5 --- Dynamic redirect
Deliver: - Public redirect route. - Active/inactive/not-found
behavior. - Destination update flow.

Acceptance: - Same physical URL redirects to the latest saved
destination for its original business. - Card cannot be reassigned.
Milestone 6 --- NFC and analytics
Deliver: - NFC programming checklist and status. - Scan event
recording. - Dashboard charts and exports.

Acceptance: - Admin can track programming/testing status. - Analytics
are based on actual recorded events. - No unsupported QR-versus-NFC
attribution is displayed.
Milestone 7 --- Production readiness
Deliver: - Automated tests. - Security review. - Deployment
documentation. - Backup/export process. - Two-card physical pilot.

Acceptance: - Critical tests pass. - Production domain and HTTPS work. -
Two physical test cards pass QR and NFC tests. - No critical security
issue remains.
16. Instructions for the coding agent
Build incrementally. Do not attempt to dump the entire application into
one file or one response.

Before editing: 1. Inspect the existing project directory. 2. Identify
existing working files and preserve them. 3. Report the planned changes.
4. Implement one milestone at a time.

For each milestone: 1. Create actual source files. 2. Explain
dependencies and environment variables. 3. Implement the complete
feature. 4. Run relevant tests. 5. Fix errors before marking it
complete. 6. Update this plan and the README with completed work. 7.
List any remaining limitations honestly.

Do not: - Build a static mockup and call it complete. - Use hardcoded
production metrics. - Simulate database success. - Leave core functions
as TODOs. - expose secrets in frontend code. - use localhost URLs in
printed QR codes. - allow card reassignment. - change a card's permanent
redirect URL after manufacturing. - claim direct NFC writing without a
real supported integration.

Start with Milestone 1 only. Once it is implemented and verified,
summarize the files created, commands to run, tests performed, and any
remaining setup required before proceeding to Milestone 2.