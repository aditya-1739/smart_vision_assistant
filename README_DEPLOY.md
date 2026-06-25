# Smart Navigation Assistant - Deployment Guide

This guide covers the deployment strategies for Phase 5 of the project. The system supports both a standalone Local Deployment and a Cloud Deployment setup using Vercel and Render.

## 1. Local Production Deployment (Phase 5A)

The local deployment builds the React frontend and serves it directly through the Python Flask backend. This eliminates the need for two separate terminals and avoids CORS issues.

### Requirements
- Python 3.10+
- Node.js 18+

### Launching on Windows
Double-click or run:
```bat
scripts\start-prod.bat
```
This script will:
1. Automatically run `npm run build` for the React frontend if needed.
2. Activate the Python virtual environment.
3. Install missing dependencies.
4. Launch the optimized `eventlet` backend on `http://localhost:5000`.

### Launching on Mac/Linux
```bash
bash scripts/start-prod.sh
```

---

## 2. Cloud Deployment (Phase 5B)

For global accessibility, the frontend is deployed to **Vercel**, and the backend is deployed as a Web Service on **Render**.

### Backend (Render Deployment)
1. Push your repository to GitHub.
2. In the Render Dashboard, create a new **Web Service**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` and `Procfile`.
5. Environment Variables to add in Render:
   - `ENV=production`
   - `ASYNC_MODE=eventlet`
   - `CAMERA_MODE=browser` (Cloud mode requires Browser WebRTC Camera)
   - `TTS_MODE=browser` (Cloud mode requires Browser TTS)
   - `CORS_ORIGINS=https://your-vercel-frontend-url.vercel.app`

### Frontend (Vercel Deployment)
1. In the Vercel Dashboard, import your GitHub repository.
2. Set the Framework Preset to **Create React App**.
3. Set the Root Directory to `frontend`.
4. Add the following Environment Variables in Vercel:
   - `REACT_APP_BACKEND_URL=https://smart-vision-api.onrender.com` (Replace with your actual Render URL)
   - `REACT_APP_SOCKET_URL=https://smart-vision-api.onrender.com`
   - `REACT_APP_CAMERA_MODE=browser`
   - `REACT_APP_TTS_MODE=browser`
5. Vercel will automatically use `vercel.json` to configure proxies and routing.

### Security
- Production mode enforces `SAMEORIGIN` framing policies and strict CORS handling.
- `Secure` and `HttpOnly` cookies are enabled in Production Mode.

### Performance Tracking
System metrics are automatically logged to `backend/logs/app.log`. Watch for encode times over 50ms, which may require lowering `TARGET_FPS`.
