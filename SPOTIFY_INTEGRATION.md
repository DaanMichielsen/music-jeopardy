# Spotify Integration Guide

This document explains how to use the centralized Spotify integration system in your Music Jeopardy application.

## Overview

The new centralized system provides:
- **Single source of truth** for Spotify authentication state
- **Automatic token refresh** when tokens expire
- **Centralized API instance** that's always up-to-date
- **SDK integration** with the Web Playback SDK
- **Consistent UI components** for showing connection status

## Architecture

### Core Components

1. **`SpotifyProvider`** (`lib/spotify-context.tsx`)
   - Manages authentication state
   - Handles token storage and refresh
   - Provides centralized API instance
   - Manages player state

2. **`useSpotify()` Hook**
   - Access Spotify context throughout the app
   - Get authentication status, user info, and API instance
   - Perform login/logout operations

3. **`useSpotifyPlayer()` Hook**
   - Manages Spotify Web Playback SDK
   - Integrates with the centralized context
   - Provides playback controls

4. **`SpotifyStatus` Component**
   - Reusable UI component for showing connection status
   - Provides login/logout buttons
   - Shows user information

## Setup

### 1. Provider Setup

The `SpotifyProvider` is already added to your root layout:

```tsx
// app/layout.tsx
import { SpotifyProvider } from "@/lib/spotify-context"

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <ThemeProvider>
        <SpotifyProvider>
          {children}
        </SpotifyProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}
```

### 2. Using the Context

In any component, you can now use the Spotify context:

```tsx
import { useSpotify } from '@/lib/spotify-context'

function MyComponent() {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    api, 
    login, 
    logout,
    getValidAccessToken 
  } = useSpotify()

  // Your component logic here
}
```

### 3. Using the Player Hook

For components that need playback functionality:

```tsx
import { useSpotifyPlayer } from '@/hooks/use-spotify-player'

function PlayerComponent() {
  const {
    isReady,
    isConnected,
    currentTrack,
    isPlaying,
    playTrack,
    pause,
    resume,
    setVolume
  } = useSpotifyPlayer()

  // Player logic here
}
```

## Usage Examples

### Basic Authentication Check

```tsx
import { useSpotify } from '@/lib/spotify-context'

function MyComponent() {
  const { isAuthenticated, isLoading } = useSpotify()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <div>Please connect to Spotify</div>
  }

  return <div>Welcome to the game!</div>
}
```

### Making API Calls

```tsx
import { useSpotify } from '@/lib/spotify-context'

function SearchComponent() {
  const { api, getValidAccessToken } = useSpotify()

  const searchTracks = async (query: string) => {
    if (!api) return

    try {
      // The API instance is automatically configured with the current token
      const results = await api.searchTracks(query, { limit: 20 })
      return results.tracks?.items || []
    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  }

  // Alternative: Get token manually for custom API calls
  const customApiCall = async () => {
    const token = await getValidAccessToken()
    if (!token) return

    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    // Handle response
  }
}
```

### Using the Status Component

```tsx
import { SpotifyStatus } from '@/components/spotify-status'

function Header() {
  return (
    <header>
      <h1>Music Jeopardy</h1>
      <SpotifyStatus variant="full" showUserInfo />
    </header>
  )
}
```

### Player Integration

```tsx
import { useSpotifyPlayer } from '@/hooks/use-spotify-player'
import { SpotifySDKLoader } from '@/components/spotify-sdk-loader'

function GameComponent() {
  return (
    <SpotifySDKLoader>
      <GameContent />
    </SpotifySDKLoader>
  )
}

function GameContent() {
  const { playTrack, pause, isPlaying, currentTrack } = useSpotifyPlayer()

  const handlePlay = async (trackId: string) => {
    const trackUri = `spotify:track:${trackId}`
    await playTrack(trackUri)
  }

  return (
    <div>
      {currentTrack && (
        <div>Now playing: {currentTrack.name}</div>
      )}
      <button onClick={() => isPlaying ? pause() : resume()}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
```

## Migration Guide

### From Old System to New System

#### Before (Old System)
```tsx
// Managing tokens manually
const accessToken = localStorage.getItem('spotify_access_token')
const response = await fetch('/api/spotify/search', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
})

// Manual authentication checks
const isConnected = !!localStorage.getItem('spotify_access_token')
```

#### After (New System)
```tsx
// Using centralized context
const { api, isAuthenticated } = useSpotify()

// API calls with automatic token management
const results = await api.searchTracks(query)

// Automatic authentication state
if (!isAuthenticated) {
  // Handle not authenticated
}
```

### Updating Existing Components

1. **Replace manual token management** with `useSpotify()`
2. **Replace localStorage checks** with `isAuthenticated`
3. **Replace manual API calls** with the centralized `api` instance
4. **Add `SpotifyStatus` component** for consistent UI

## API Reference

### useSpotify() Hook

```tsx
const {
  // State
  isAuthenticated: boolean,
  isLoading: boolean,
  user: SpotifyUser | null,
  tokens: SpotifyTokens | null,
  api: SpotifyWebApi | null,
  
  // Actions
  login: () => void,
  logout: () => void,
  refreshTokens: () => Promise<boolean>,
  getValidAccessToken: () => Promise<string | null>,
  
  // Player state
  playerReady: boolean,
  playerConnected: boolean,
  currentTrack: any,
  isPlaying: boolean,
  setPlayerState: (state) => void
} = useSpotify()
```

### SpotifyStatus Component

```tsx
<SpotifyStatus 
  showUserInfo={boolean}    // Show user name when connected
  variant="compact" | "full" // UI variant
  className={string}        // Additional CSS classes
/>
```

### useSpotifyPlayer() Hook

```tsx
const {
  player: SpotifyPlayer | null,
  isReady: boolean,
  isConnected: boolean,
  currentTrack: any,
  isPlaying: boolean,
  position: number,
  duration: number,
  volume: number,
  connect: () => Promise<boolean>,
  disconnect: () => void,
  playTrack: (uri: string, position?: number) => Promise<boolean>,
  pause: () => Promise<void>,
  resume: () => Promise<void>,
  seek: (position: number) => Promise<void>,
  setVolume: (volume: number) => Promise<void>
} = useSpotifyPlayer()
```

## Best Practices

1. **Always check `isLoading`** before using Spotify functionality
2. **Use the centralized `api` instance** instead of manual fetch calls
3. **Handle authentication errors** gracefully with the context
4. **Use `SpotifyStatus` component** for consistent UI
5. **Wrap player components** with `SpotifySDKLoader`
6. **Use `getValidAccessToken()`** for custom API calls that need the token

## Troubleshooting

### Common Issues

1. **"useSpotify must be used within a SpotifyProvider"**
   - Ensure `SpotifyProvider` is in your component tree
   - Check that it's imported and used in `layout.tsx`

2. **Tokens not refreshing automatically**
   - The context handles this automatically
   - Check that `refreshTokens()` is being called on errors

3. **Player not connecting**
   - Ensure user has Spotify Premium
   - Check that `SpotifySDKLoader` is wrapping the component
   - Verify authentication is successful

4. **API calls failing**
   - Use `getValidAccessToken()` to ensure fresh tokens
   - Check that `isAuthenticated` is true before making calls

### Debug Information

The context provides debug information in the console. Look for:
- `=== useSpotifyPlayer Debug ===` for player status
- Token refresh logs
- Authentication state changes
- API call results

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SPOTIFY_REDIRECT_URL=your_redirect_url
```

## Security Notes

- Tokens are stored in localStorage (consider more secure storage for production)
- Refresh tokens are automatically handled
- API calls use the centralized instance with proper error handling
- Authentication state is managed centrally to prevent inconsistencies 