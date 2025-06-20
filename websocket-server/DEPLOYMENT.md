# WebSocket Server Deployment Guide

## Overview
This Socket.IO server handles real-time communication for the Music Jeopardy game, including buzzer functionality and avatar updates.

## Deployment Options

### ❌ Vercel (Not Supported)
Vercel is a serverless platform that doesn't support long-running WebSocket connections. Your Socket.IO server will not work on Vercel.

### ✅ Railway (Recommended)
Railway is perfect for Socket.IO servers and offers a free tier.

#### Railway Deployment Steps:

1. **Prepare Your Repository**
   ```bash
   # Ensure your websocket-server directory is ready
   cd websocket-server
   npm install
   ```

2. **Deploy to Railway**
   - Go to [Railway.app](https://railway.app)
   - Create new project
   - Connect your GitHub repository
   - Select the `websocket-server` directory
   - Railway will automatically detect it's a Node.js app

3. **Set Environment Variables**
   In Railway dashboard, add these environment variables:
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app
   ```

4. **Get Your WebSocket URL**
   - Railway will provide a URL like: `https://your-app-name.railway.app`
   - Use this as your WebSocket server URL

### ✅ Render.com (Alternative)
Render offers a free tier and good WebSocket support.

#### Render Deployment Steps:

1. **Create a Render Account**
   - Go to [Render.com](https://render.com)
   - Sign up with GitHub

2. **Create a Web Service**
   - Click "New Web Service"
   - Connect your GitHub repository
   - Select the `websocket-server` directory

3. **Configure the Service**
   - **Name**: `music-jeopardy-websocket`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Set Environment Variables**
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-nextjs-app.vercel.app
   ```

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
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `https://app.vercel.app` |

### Update Your Next.js App

After deploying your WebSocket server, update your Next.js app:

1. **Add Environment Variable**
   Create `.env.local` in your Next.js project:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-websocket-server.railway.app
   ```

2. **For Vercel Deployment**
   Add the environment variable in Vercel dashboard:
   - Go to your project settings
   - Add environment variable: `NEXT_PUBLIC_SOCKET_URL`
   - Value: Your WebSocket server URL

## Testing Your Deployment

1. **Health Check**
   Visit: `https://your-websocket-server.railway.app/health`
   Should return: `{"status":"ok","timestamp":"...","environment":"production","activeGames":0}`

2. **Test WebSocket Connection**
   ```javascript
   // In browser console
   const socket = io('https://your-websocket-server.railway.app');
   socket.on('connect', () => console.log('Connected!'));
   ```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `ALLOWED_ORIGINS` includes your Next.js app URL
   - Check that the URL format is correct (no trailing slash)

2. **Connection Timeouts**
   - Verify the WebSocket server is running
   - Check Railway/Render logs for errors

3. **Environment Variables**
   - Ensure all required variables are set
   - Check that `NEXT_PUBLIC_SOCKET_URL` is set in your Next.js app

### Railway-Specific Issues

1. **Build Failures**
   - Check that `package.json` has correct scripts
   - Ensure all dependencies are in `dependencies` (not `devDependencies`)

2. **Runtime Errors**
   - Check Railway logs in the dashboard
   - Verify the start command is correct

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