# Music Jeopardy Game

A music trivia game with Spotify integration, real-time multiplayer features, and a phone buzzer system.

## Features

- 🎵 **Spotify Integration**: Search and play music snippets for questions
- 👥 **Multiplayer**: Real-time game lobby with team management
- 📱 **Phone Buzzer**: QR code-based buzzer system for players
- 🎮 **Game Board**: Interactive Jeopardy-style game board
- 🎨 **Modern UI**: Beautiful dark theme with smooth animations
- 🔐 **Authentication**: Clerk-based user authentication
- 🎵 **Lyrics Translation**: Translate song lyrics between Dutch and English

## Game Types

### 1. Music Trivia
- Create categories with music questions
- Integrate with Spotify for audio playback
- Use buzzer system for competitive gameplay
- Score tracking and team management

### 2. Lyrics Translation
- Paste lyrics in Dutch or English
- Automatic translation using DeepL API
- Create translation challenges
- Team-based scoring system

## Lyrics Translation Game

The lyrics translation game allows players to translate song lyrics between different languages. Players can create categories and questions, then play a translation game where they translate lyrics from one language to another.

### Supported Languages

The lyrics translation game supports the following languages:
- **English (en)** - English lyrics
- **Dutch (nl)** - Dutch lyrics  
- **Spanish (es)** - Spanish lyrics
- **French (fr)** - French lyrics

Players can translate between any combination of these languages (e.g., English to Spanish, French to Dutch, etc.).

### Setup

1. **DeepL API Configuration**: 
   - Sign up for a free DeepL API key at https://www.deepl.com/pro-api
   - Add your API key to your `.env` file:
   ```
   DEEPL_API_KEY=your_api_key_here
   ```

2. **Database Migration**: Run the database migration to add the new tables:
   ```bash
   npx prisma migrate dev --name add-lyrics-translation-support
   ```

### How to Use

1. **Create a Game**: Start a new game and select "Lyrics Translation" as the game type
2. **Setup Categories**: Create categories to organize your translation questions
3. **Add Questions**: For each question:
   - Choose source and target languages
   - Paste original lyrics
   - Use the "Translate Lyrics" button to get an AI translation
   - Optionally add song title, artist, and hints
   - Set point values (100-500 points)
4. **Play the Game**: Players take turns translating lyrics between the specified languages

### Features

- **AI-Powered Translation**: Uses DeepL API for high-quality translations
- **Multiple Language Support**: Translate between English, Dutch, Spanish, and French
- **Category Organization**: Group questions by theme or difficulty
- **Hints System**: Add helpful hints for players
- **Point System**: Assign different point values to questions
- **Team-Based Scoring**: Track scores for multiple teams
- **Progress Tracking**: Monitor game progress and completion

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Spotify Developer Account
- Clerk Account for authentication
- Prisma database (PostgreSQL recommended)
- DeepL API Account (for lyrics translation)

### Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Fill in your Spotify, Clerk, and DeepL credentials
   ```

3. **Set up database:**
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

4. **Start development servers:**
   ```bash
   # Start both Next.js and WebSocket servers
   pnpm dev:full
   
   # Or start them separately:
   pnpm dev:network  # Next.js server accessible from network
   pnpm socket       # WebSocket server for real-time features
   ```

### Network Access

The development setup automatically detects your local IP addresses and makes the app accessible from any device on your network. This is essential for the phone buzzer system.

**Available commands:**
- `pnpm dev` - Local development only
- `pnpm dev:network` - Network accessible Next.js server
- `pnpm dev:full` - Both servers with network access
- `pnpm socket` - WebSocket server only

### Spotify SDK Loading

The app now conditionally loads the Spotify SDK only on pages that need it:
- Game Board (for playing music snippets)
- Spotify Search (for finding tracks)
- Question Setup (for audio player)

This prevents the "onSpotifyWebPlaybackSDKReady is not defined" error on pages like the buzzer.

## Production Deployment

### 1. Deploy the Main App (Vercel)

1. **Push your code to GitHub**
2. **Connect to Vercel** and deploy the main app
3. **Set environment variables in Vercel:**
   ```
   DATABASE_URL=your-production-database-url
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
   CLERK_SECRET_KEY=your-clerk-secret
   SPOTIFY_CLIENT_ID=your-spotify-client-id
   SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
   NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket-server.com
   NEXT_PUBLIC_API_BASE_URL=https://your-vercel-app.vercel.app
   WEBSOCKET_SERVER_URL=https://your-websocket-server.com
   ```

### 2. Deploy the WebSocket Server

The WebSocket server needs to be deployed separately. See the [websocket-server/README.md](websocket-server/README.md) for detailed instructions.

**Quick deployment options:**
- **Railway** (Recommended): Easy deployment with automatic HTTPS
- **Render**: Free tier available
- **DigitalOcean/VPS**: More control but requires manual setup

### 3. Environment Variables

#### For Vercel (Main App)
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Spotify
SPOTIFY_CLIENT_ID="your-spotify-client-id"
SPOTIFY_CLIENT_SECRET="your-spotify-client-secret"

# WebSocket Server
NEXT_PUBLIC_WEBSOCKET_URL="wss://your-websocket-server.com"
WEBSOCKET_SERVER_URL="https://your-websocket-server.com"

# API Base URL
NEXT_PUBLIC_API_BASE_URL="https://your-vercel-app.vercel.app"
```

#### For WebSocket Server
```bash
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

### 4. Update Spotify Redirect URIs

In your Spotify Developer Dashboard, add your production callback URL:
```
https://your-vercel-app.vercel.app/api/spotify/callback
```

## Architecture

- **Frontend**: Next.js 15 with React 19
- **Backend**: Prisma with PostgreSQL
- **Real-time**: Socket.IO for buzzer and avatar updates
- **Authentication**: Clerk
- **Music**: Spotify Web Playback SDK
- **Styling**: Tailwind CSS with shadcn/ui components

## Troubleshooting

### Spotify SDK Errors
- Ensure you're authenticated with Spotify
- Check that you have Spotify Premium (required for Web Playback SDK)
- The SDK is now loaded conditionally to prevent errors

### WebSocket Connection Issues
- Make sure the socket server is running (`pnpm socket`)
- Check that both servers are accessible from your device's IP
- Use `pnpm dev:full` for automatic setup
- In production, verify the WebSocket server URL is correct

### Network Access Issues
- Use `pnpm dev:network` instead of `pnpm dev`
- Check your firewall settings
- Ensure both ports 3000 and 3001 are accessible

### Production Issues
- Verify all environment variables are set correctly
- Check that the WebSocket server is running and accessible
- Ensure CORS is configured properly on the WebSocket server
- Test the health check endpoint: `https://your-websocket-server.com/health`

## Deployment

Your project is live at:

**[https://vercel.com/daan-michielsen/v0-game-lobby-screen-design](https://vercel.com/daan-michielsen/v0-game-lobby-screen-design)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/FiHZmGfhAyu](https://v0.dev/chat/projects/FiHZmGfhAyu)**
