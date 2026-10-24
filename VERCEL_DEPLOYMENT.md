# Deploying Tech For You to Vercel

This project is fully configured and ready for 1-click or Git deployment to **Vercel**.

---

## Architecture Overview on Vercel

- **Frontend**: High-performance React 19 SPA built by Vite into the `dist/` directory, served globally across Vercel's Edge CDN.
- **Backend API**: Modular Node.js / Express backend deployed as a Serverless Function at `/api/index.ts`.
- **Database**: Cloud persistence via **MongoDB Atlas** (`MONGODB_URI`). In serverless environments, local database fallback automatically operates out of `/tmp` with zero file-permission errors (`EROFS`).
- **Routing**: `vercel.json` rewrites `/api/*` to the serverless function and routes all client-side pages to `/index.html` for single-page client routing.

---

## Step-by-Step Deployment Instructions

### 1. Push Code to GitHub / GitLab / Bitbucket
Push this repository to your preferred Git provider.

### 2. Import into Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." → "Project"**.
2. Select your repository and click **"Import"**.

### 3. Build & Output Settings
Vercel will automatically detect `vercel.json` with the following configuration:
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. Configure Environment Variables
In the **Environment Variables** section on Vercel, add:

| Key | Value | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.xyz.mongodb.net/tech_for_you?retryWrites=true&w=majority` | Your MongoDB Atlas connection string. |
| `JWT_SECRET` | `tech-for-you-super-secure-jwt-secret-key-2026` | Secret key for signing admin authentication tokens. |

*(Note: In MongoDB Atlas, remember to allow access from anywhere under **Network Access** by adding `0.0.0.0/0` so Vercel's serverless lambdas can connect).*

### 5. Click "Deploy"
Vercel will compile the Vite frontend, bundle the serverless `/api` handler, and provide your live production URL (e.g., `https://tech-for-you.vercel.app`).

---

## Local Development vs Vercel Serverless

- **Local Development**:
  ```bash
  npm run dev
  ```
  Runs Vite dev server with Express middleware on `http://localhost:3000`.

- **Production Standalone Server**:
  ```bash
  npm run build
  npm start
  ```

- **Vercel Serverless Function**:
  Handled by `/api/index.ts` and configured in `vercel.json`.
