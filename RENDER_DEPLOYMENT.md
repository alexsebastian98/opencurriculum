# Render Deployment Guide for OpenCurriculum

## Step 1: Prepare MongoDB Atlas

1. **Whitelist Your Computer IP** (for local testing):
   - Go to https://cloud.mongodb.com/
   - Navigate to your cluster → Network Access
   - Click "Add IP Address"
   - Add your current IP or "0.0.0.0/0" to allow all
   - Click "Confirm"

2. **Whitelist Render IPs** (for production):
   - Add these Render outbound CIDR ranges to Network Access:
     - `74.220.48.0/24`
     - `74.220.56.0/24`
   - These are shared Render egress ranges for your region.
   - Avoid `0.0.0.0/0` unless you are doing temporary troubleshooting.

3. **Get Your Connection String**:
   - Go to "Connect" → "Drivers"
   - Copy the MongoDB connection string
   - Note: Use the format with `/opencurriculum` database name

## Step 2: Deploy to Render

### Backend Deployment
1. Go to https://dashboard.render.com/
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Set these values:
   - **Name**: `opencurriculum-api`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Root Directory**: `backend`
   - **Environment Variables**:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `GITHUB_TOKEN`: Your GitHub token
       - `CORS_ORIGINS`: `https://opencurriculum-frontend.onrender.com`
     - `PORT`: 5000
     - `NODE_ENV`: production
5. Click "Create Web Service"

### Frontend Deployment  
1. After backend is deployed, get the backend URL (e.g., https://opencurriculum-api.onrender.com)
2. Click "New" → "Static Site"
3. Connect your GitHub repository
4. Set these values:
   - **Name**: `opencurriculum-frontend`
   - **Build Command**: `cd frontend && npm install --include=dev && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://opencurriculum-api.onrender.com/api`
5. Click "Create Static Site"

## Step 3: Configure Environment Variables in Render

After both services are created:

### For Backend Service
1. Go to opencurriculum-api settings
2. Click "Environment"
3. Add/update variables:
   - `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/opencurriculum?retryWrites=true&w=majority`
   - `GITHUB_TOKEN=your_token`
   - `CORS_ORIGINS=https://your-frontend-host.onrender.com`

### Health Check
After deployment, verify the backend health endpoint at `https://your-backend-host.onrender.com/health`.

### For Frontend Service
1. Go to opencurriculum-frontend settings
2. The build command will use `VITE_API_URL` to point to your backend

## Step 4: Deploy

Both services should deploy automatically. Check deployment status in the Render dashboard.

## Troubleshooting

**MongoDB Connection Errors**:
- Verify your IP is whitelisted on MongoDB Atlas
- Verify both Render outbound ranges are whitelisted in Atlas
- Check that your connection string includes the database name `/opencurriculum`
- Test locally first with the correct MONGODB_URI

**Frontend API Errors**:
- Make sure backend URL in VITE_API_URL is correct
- Check `CORS_ORIGINS` in the backend Render service

**Deployment Hangs**:
- Check build logs in Render dashboard
- Ensure all dependencies in package.json are correct

**Frontend build fails with status 127**:
- Remove `NODE_ENV` from the frontend service environment variables (do not set it there)
- Ensure build command includes dev dependencies: `npm install --include=dev && npm run build`
- Check logs for `vite: not found`, which indicates dev dependencies were omitted

