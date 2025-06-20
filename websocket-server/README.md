# Music Jeopardy WebSocket Server

A Socket.IO server for real-time communication in the Music Jeopardy game.

## Features

- Real-time buzzer functionality
- Avatar updates
- Game room management
- Health check endpoint

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

The server will run on `http://localhost:3001`

### Deploy to Render (Free)

1. **Push to GitHub**
2. **Go to [Render.com](https://render.com)**
3. **Create New Web Service**
4. **Connect your GitHub repository**
5. **Select the `websocket-server` directory**
6. **Configure:**
   - **Name**: `music-jeopardy-websocket`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

7. **Set Environment Variables:**
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://music-jeopardy-green.vercel.app`

8. **Deploy and get your URL**

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `ALLOWED_ORIGINS` | CORS origins | `*` |

## API Endpoints

- `GET /health` - Health check
- `POST /emit` - Emit WebSocket events

## WebSocket Events

### Client to Server
- `join-game` - Join a game room
- `leave-game` - Leave a game room
- `buzz-in` - Player buzzes in
- `avatar-updated` - Avatar update

### Server to Client
- `buzz-activated` - Buzzer activated
- `buzz-deactivated` - Buzzer deactivated
- `buzz-success` - Buzz successful
- `buzz-failed` - Buzz failed
- `first-buzz` - First player to buzz
- `avatar-updated` - Avatar updated

## Testing

```bash
# Health check
curl https://your-app-name.onrender.com/health

# Test WebSocket connection
# In browser console:
const socket = io('https://your-app-name.onrender.com');
socket.on('connect', () => console.log('Connected!'));
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions. 