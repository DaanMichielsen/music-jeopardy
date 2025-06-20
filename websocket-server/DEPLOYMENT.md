# WebSocket Server Deployment Guide

## Overview
This Socket.IO server handles real-time communication for the Music Jeopardy game, including buzzer functionality and avatar updates.

## Deployment Options

### ❌ Vercel (Not Supported)
Vercel is a serverless platform that doesn't support long-running WebSocket connections. Your Socket.IO server will not work on Vercel.

### ✅ Render.com (Recommended)
Render offers a free tier and excellent WebSocket support.

#### Render Deployment Steps:

1. **Prepare Your Repository**
   ```bash
   # Ensure your websocket-server directory is ready
   cd websocket-server
   npm install
   ```

2. **Create a Render Account**
   - Go to [Render.com](https://render.com)
   - Sign up with GitHub

3. **Create a Web Service**
   - Click "New Web Service"
   - Connect your GitHub repository
   - Select the `websocket-server` directory

4. **Configure the Service**
   - **Name**: `music-jeopardy-websocket`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. **Set Environment Variables**
   In Render dashboard, add these environment variables:
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://music-jeopardy-green.vercel.app
   ```

6. **Get Your WebSocket URL**
   - Render will provide a URL like: `https://your-app-name.onrender.com`
   - Use this as your WebSocket server URL

### ✅ Railway (Alternative)
Railway is also good for Socket.IO servers and offers a free tier.

### ✅ DigitalOcean App Platform
Good for production deployments, starts at $5/month.

### ✅ Google Cloud Run
Serverless but supports WebSockets, pay-per-use.

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3001` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `https://music-jeopardy-green.vercel.app` |

### Update Your Next.js App

After deploying your WebSocket server, update your Next.js app:

1. **Add Environment Variable**
   Create `.env.local` in your Next.js project:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-app-name.onrender.com
   ```

2. **For Vercel Deployment**
   Add the environment variable in Vercel dashboard:
   - Go to your project settings
   - Add environment variable: `NEXT_PUBLIC_SOCKET_URL`
   - Value: Your WebSocket server URL

## Testing Your Deployment

1. **Health Check**
   Visit: `https://your-app-name.onrender.com/health`
   Should return: `{"status":"ok","timestamp":"...","environment":"production","activeGames":0}`

2. **Test WebSocket Connection**
   ```javascript
   // In browser console
   const socket = io('https://your-app-name.onrender.com');
   socket.on('connect', () => console.log('Connected!'));
   ```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `ALLOWED_ORIGINS` includes your Next.js app URL
   - Check that the URL format is correct (no trailing slash)

2. **Connection Timeouts**
   - Verify the WebSocket server is running
   - Check Render logs for errors

3. **Environment Variables**
   - Ensure all required variables are set
   - Check that `NEXT_PUBLIC_SOCKET_URL` is set in your Next.js app

### Render-Specific Issues

1. **Build Failures**
   - Check that `package.json` has correct scripts
   - Ensure all dependencies are in `dependencies` (not `devDependencies`)

2. **Runtime Errors**
   - Check Render logs in the dashboard
   - Verify the start command is correct

3. **Free Tier Limitations**
   - Render free tier has cold starts (first request may be slow)
   - Service sleeps after 15 minutes of inactivity
   - Consider upgrading to paid plan for production use

## Local Development

```bash
cd websocket-server
npm install
npm run dev
```

The server will run on `http://localhost:3001`

## Production Checklist

- [ ] WebSocket server deployed and accessible
- [ ] Environment variables configured
- [ ] CORS origins set correctly
- [ ] Next.js app updated with WebSocket URL
- [ ] Health check endpoint working
- [ ] WebSocket connections tested 