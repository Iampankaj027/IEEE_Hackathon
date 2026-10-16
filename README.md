# VeriCred - Decentralized Institutional Participation & Cryptographic Credential Engine

## Local Development Setup

### 1. Backend
```bash
cd backend
npm install
npx prisma generate          # Generate Prisma client
npx prisma db push           # Sync database schema (PostgreSQL)
npm run seed                 # Seed default admin, faculty, sample students, and passcodes
npm run dev                  # Start backend dev server on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                  # Start Vite dev server on http://localhost:5173
```

---

## Production Deployment Guide

### A. Deploy Backend to Render

1. Go to **[Render Dashboard](https://dashboard.render.com/)** -> **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/`
4. In **Environment Variables**, set:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `<your-postgresql-connection-string>` (e.g., Neon.tech or Supabase with `?sslmode=require`)
   - `JWT_SECRET` = `<secure-random-string-min-32-chars>`
   - `CRYPTO_HMAC_SECRET` = `<64-char-hex-secret-for-crypto-signatures>`
   - `FRONTEND_URL` = `https://<your-frontend-app>.vercel.app`
   - `ISSUER_INSTITUTION_NAME` = `Swami Keshvanand Institute of Technology (SKIT)`
5. After the first build deploys:
   - Open Render service **Shell** tab or run locally targeting production DB:
     ```bash
     npx prisma db push
     node prisma/seed.js
     ```

*(Alternative: Render will automatically detect the included [`render.yaml`](./render.yaml) blueprint if deployed via Blueprints).*

---

### B. Deploy Frontend to Vercel

1. Go to **[Vercel Dashboard](https://vercel.com/)** -> **Add New...** -> **Project**.
2. Import your GitHub repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, set:
   - `VITE_API_BASE_URL` = `https://<your-render-backend-url>.onrender.com/api`
5. Click **Deploy**.
   - The included [`frontend/vercel.json`](./frontend/vercel.json) ensures all SPA routes (`/login`, `/verify/:id`, `/u/:rollNo`, etc.) resolve properly without 404s on page refresh.

---

## Seed Accounts (After Running `npm run seed`)

| Role | Email | Password | Details |
|---|---|---|---|
| **HOD Admin** | `hod.it@skit.ac.in` | `Password@123` | Institutional IQAC HOD account |
| **Faculty** | `ankit.sharma@skit.ac.in` | `Password@123` | Faculty marks & event evaluator |
| **Student 1** | `aarav.23eskit001@skit.ac.in` | `Password@123` | Roll No: `23ESKIT001` (Winner 1st) |
| **Student 2** | `priya.23eskit014@skit.ac.in` | `Password@123` | Roll No: `23ESKIT014` (Finalist) |
| **Student 3** | `kunal.23eskit028@skit.ac.in` | `Password@123` | Roll No: `23ESKIT028` (Participant) |

*Faculty Registration Passcode for new signups:* `SKIT-FAC-2026-SECURE`