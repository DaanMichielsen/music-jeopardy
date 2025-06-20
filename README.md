# Music Jeopardy Game

A music trivia game with Spotify integration, real-time multiplayer features, and a phone buzzer system.

## Features

- 🎵 **Spotify Integration**: Search and play music snippets for questions
- 👥 **Multiplayer**: Real-time game lobby with team management
- 📱 **Phone Buzzer**: QR code-based buzzer system for players
- 🎮 **Game Board**: Interactive Jeopardy-style game board
- 🎨 **Modern UI**: Beautiful dark theme with smooth animations
- 🔐 **Authentication**: Clerk-based user authentication

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Spotify Developer Account
- Clerk Account for authentication
- Prisma database (PostgreSQL recommended)

### Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Fill in your Spotify and Clerk credentials
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

### Network Access Issues
- Use `pnpm dev:network` instead of `pnpm dev`
- Check your firewall settings
- Ensure both ports 3000 and 3001 are accessible

## Deployment

Your project is live at:

**[https://vercel.com/daan-michielsen/v0-game-lobby-screen-design](https://vercel.com/daan-michielsen/v0-game-lobby-screen-design)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/FiHZmGfhAyu](https://v0.dev/chat/projects/FiHZmGfhAyu)**
