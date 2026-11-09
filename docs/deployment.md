# TapReview Production Deployment Guide

## 1. Architecture Overview
- **Frontend**: React + Vite + Tailwind CSS deployed to Vercel / Netlify / Render Static Site.
- **Backend**: Python 3.10+ / 3.13 Flask API and Redirect Service deployed on Render with Gunicorn.
- **Database**: Supabase PostgreSQL with Row Level Security, Unique Constraints, and Assignment Integrity Triggers.
- **Physical Cards**: 50 pre-manufactured NFC cards (TR001 to TR050) preprinted with permanent URLs: `https://yourdomain.com/r/TR001` to `https://yourdomain.com/r/TR050`.

---

## 2. Database Setup (Supabase PostgreSQL)
1. Sign in to your [Supabase Dashboard](https://supabase.com).
2. Create a new project (e.g. `tapreview-prod`).
3. Open the **SQL Editor**.
4. Paste and execute the contents of `backend/database/migrations/001_initial_schema.sql`.
5. Under **Project Settings -> API**, copy:
   - `Project URL` (e.g. `https://xyzcompany.supabase.co`)
   - `service_role secret` (privileged key for backend operations; never share or expose on the frontend).

---

## 3. Backend Deployment (Render / Railway)
1. Push repository to GitHub or GitLab.
2. In [Render](https://render.com), click **New + -> Web Service**.
3. Set **Root Directory** to `backend`.
4. Configure Build & Start commands:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT app:app`
5. Configure Environment Variables:
   ```env
   FLASK_ENV=production
   PORT=5000
   SECRET_KEY=<generate_a_random_32_character_secret>
   ADMIN_EMAIL=owner@tapreview.com
   ADMIN_PASSWORD=<strong_random_admin_password>
   PUBLIC_REDIRECT_BASE_URL=https://yourdomain.com
   SUPABASE_URL=https://xyzcompany.supabase.co
   SUPABASE_SERVICE_KEY=eyJh...service_role_key...
   CORS_ORIGINS=https://admin.yourdomain.com,https://yourdomain.com
   TIMEZONE=Asia/Kolkata
   ```
6. Deploy the service and verify `GET https://yourdomain.com/health` returns `{"status": "healthy"}`.

---

## 4. Frontend Deployment (Vercel / Netlify)
1. Link your repository in [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Configure Build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   ```env
   VITE_API_URL=https://api.yourdomain.com
   ```
5. Deploy.

---

## 5. Physical NFC & QR Manufacturing Workflow
1. **Confirm Domain First**:
   Ensure `https://yourdomain.com` is active with valid SSL/TLS certificates before printing.
2. **Download Print Assets**:
   - In TapReview Admin, navigate to **QR Management**.
   - Click **Download ZIP Archive** to get high-res (300 DPI) `TR001.png` through `TR050.png`.
   - Click **Export CSV Manifest** for the print vendor.
   - Click **Print Production Sheet** for in-house printing.
3. **NFC Writing with NFC Tools App**:
   - Open **NFC Tools** on Android or iOS.
   - Select **Write** -> **Add a record** -> **URL / URI**.
   - Enter `https://yourdomain.com/r/TR001`.
   - Tap physical card against phone to write the NDEF record.
   - In TapReview Admin -> Card Inventory -> Mark NFC as **PROGRAMMED**, then tap test and mark as **TESTED**.
4. **Card Activation on Delivery**:
   - Visit partner business.
   - Open TapReview Admin on phone.
   - Go to **Activate Card**, select available card (e.g. TR001), input business name and Google Review link.
   - Confirm activation.
   - Card is now permanently live!

