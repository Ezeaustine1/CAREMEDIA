# CAREMEDIA — Luxury Photography, Videography & Media Production Platform

**"Capturing Moments. Creating Memories. Telling Stories."**

A full-stack commercial photography, cinema production, client booking, and Studio Admin CMS platform built for **CAREMEDIA** (Ota, Ogun State, Nigeria — `08063751294`).

---

## Architecture Overview (Zero External Database Dependency)

This project includes everything needed to run locally, deploy to **Netlify**, or host on any Node.js server **without Supabase or any external SQL database**:

1. **Frontend (`src/`)**
   - React 19 + TypeScript + Tailwind CSS v4 + Motion animations.
   - **Full-Frame Uncropped Studio Media Rendering (`src/components/ResilientImage.tsx`)**: Displays client portrait, landscape, and square uploads in full without cropping heads or edges.
   - **Dedicated Category Archive View (`src/components/PortfolioArchivePage.tsx`)**: Keeps the homepage curated and fast while letting visitors browse 100+ uploaded photographs and films per category (`Weddings` through `Videography`).
   - **Cinematic Video Showcase & Featured Film Reels (`src/components/MediaLightbox.tsx`)**: Supports uploaded MP4/WebM video files (`vault://`), YouTube links, Vimeo links, and direct video URLs with inline preview and full-screen cinema modal playback.
   - **Verified Customer Reviews (Row of 5)**: Responsive 5-column verified client review showcase with interactive rating submission and full admin management.
   - **High-Capacity Browser Media Vault (`src/lib/mediaVault.ts`)**: Stores high-resolution uploaded photos and video blobs in IndexedDB so 100+ media items load instantaneously.

2. **Backend & REST API (`server.ts`, `server/apiRouter.ts`, `netlify/functions/api.ts`)**
   - Express.js REST API server (`server.ts`) mounted at `/api/*` alongside Vite middleware in development and static `dist/` serving in production.
   - **Netlify Serverless Function (`netlify/functions/api.ts`)**: Exposes the exact same `/api/*` endpoints automatically when deployed to Netlify.

3. **Self-Contained Built-In Database (`server/db.ts` & `data/caremedia-db.json`)**
   - Native JSON document database engine (`data/caremedia-db.json`) with atomic writes, auto-seeding from `src/data/initialData.ts`, and automatic in-memory fallback on read-only serverless filesystems.
   - Collections: `portfolio`, `categories`, `services`, `bookings`, `testimonials`, `settings`, and `meta`.

4. **Built-In Admin Authentication (`server/db.ts` & `/api/auth/*`)**
   - Stateless HMAC-SHA256 signed bearer token authentication (`createAdminToken` / `verifyAdminToken`) plus instant Studio Admin Passcode & Email verification.
   - Default Studio Admin Email: `ezehaustine1@gmail.com`
   - Default Studio Admin Passcode: `CAREMEDIA2026`

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check and database record counts |
| `POST` | `/api/auth/login` | Authenticate admin via email or passcode and receive signed JWT token |
| `GET` | `/api/auth/verify` | Verify Bearer token validity |
| `GET` | `/api/bootstrap` | Fetch complete studio state (`portfolio`, `categories`, `services`, `bookings`, `testimonials`, `settings`) |
| `GET` | `/api/portfolio` | List all portfolio photographs & films |
| `POST` | `/api/portfolio` | Create or update a portfolio item |
| `POST` | `/api/portfolio/batch` | Batch upload multiple photographs & films |
| `DELETE` | `/api/portfolio/:id` | Delete a portfolio item |
| `GET` | `/api/categories` | List all portfolio categories |
| `POST` | `/api/categories` | Create or update a portfolio category |
| `DELETE` | `/api/categories/:id` | Delete a custom category |
| `GET` | `/api/services` | List all 10+ studio services |
| `POST` | `/api/services` | Create or update a service card |
| `DELETE` | `/api/services/:id` | Delete a service card |
| `GET` | `/api/bookings` | List client bookings & enquiries |
| `POST` | `/api/bookings` | Submit or update a client booking |
| `PATCH` | `/api/bookings/:id/status` | Update booking status (`new`, `confirmed`, `completed`, `archived`) |
| `DELETE` | `/api/bookings/:id` | Delete a booking record |
| `GET` | `/api/testimonials` | List verified customer reviews |
| `POST` | `/api/testimonials` | Submit or update a customer review |
| `DELETE` | `/api/testimonials/:id` | Delete a customer review |
| `GET` | `/api/settings` | Get studio contact & hero configuration |
| `PUT` | `/api/settings` | Update studio contact, WhatsApp, and hero settings |
| `POST` | `/api/seed` | Reset or seed default CAREMEDIA studio data |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the full-stack server (Express API + Vite frontend on http://localhost:3000)
npm run dev

# 3. Typecheck & build for production
npm run lint
npm run build
```

---

## Deploying to GitHub & Netlify

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "feat: complete CAREMEDIA full-stack platform ready for Netlify & GitHub"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
- Included `.github/workflows/ci-deploy.yml` automatically runs `npm run lint` and `npm run build` on every push and pull request.

### 2. Deploy to Netlify (Zero Config Required)
This repository includes `netlify.toml`, `public/_redirects`, and `netlify/functions/api.ts`:
1. Log in to [Netlify](https://app.netlify.com/) and click **Add new site → Import an existing project**.
2. Connect your GitHub repository.
3. Netlify will automatically detect the settings from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. *(Optional)* In **Site configuration → Environment variables**, set:
   - `ADMIN_EMAIL` = `ezehaustine1@gmail.com`
   - `ADMIN_PASSCODE` = `CAREMEDIA2026`
   - `ADMIN_JWT_SECRET` = *(any strong secret string)*
5. Click **Deploy site**. Your site and `/api/*` endpoints will be live immediately.
