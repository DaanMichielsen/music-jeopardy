# Music Jeopardy WebSocket Server

This is the WebSocket server for the Music Jeopardy game, handling real-time communication for buzzer functionality and avatar updates.

## Features

- Real-time buzzer system for game participants
- Avatar update notifications
- Game room management
- Health check endpoint
- Production-ready with environment variables

## Deployment Options

### Option 1: Railway (Recommended)

1. Create a new Railway project
2. Connect your GitHub repository
3. Set the root directory to `websocket-server`
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
   ```
5. Deploy

### Option 2: Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the root directory to `websocket-server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
   ```

### Option 3: VPS/DigitalOcean

1. Clone the repository
2. Navigate to `websocket-server`
3. Run `npm install`
4. Set environment variables
5. Use PM2 or similar to run: `pm2 start server.js`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `*` |

## Health Check

The server provides a health check endpoint at `/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "activeGames": 5
}
```

## API Endpoints

### POST /emit
Send events to connected clients:

```json
{
  "event": "avatar-updated",
  "data": {
    "gameId": "game-123",
    "playerId": "player-456",
    "avatarUrl": "https://..."
  }
}
```

## WebSocket Events

### Client to Server
- `join-game` - Join a game room
- `leave-game` - Leave a game room
- `buzz-in` - Player buzzes in
- `avatar-updated` - Avatar update notification

### Server to Client
- `buzz-activated` - Buzzer activated
- `buzz-deactivated` - Buzzer deactivated
- `buzz-reset` - Buzzer reset
- `buzz-success` - Successful buzz
- `buzz-failed` - Failed buzz
- `first-buzz` - First player to buzz
- `avatar-updated` - Avatar update notification

## Development

```bash
cd websocket-server
npm install
npm run dev
```

The server will start on port 3001 and log available network addresses for local development. 