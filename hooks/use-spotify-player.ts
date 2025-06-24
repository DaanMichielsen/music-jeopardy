import { useState, useEffect, useCallback } from 'react'
import { useSpotify } from '@/lib/spotify-context'

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: {
      Player: new (config: any) => SpotifyPlayer
    }
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  getCurrentState(): Promise<SpotifyPlaybackState | null>
  activateElement(): void
  addListener(event: string, callback: (data: any) => void): void
  removeListener(event: string, callback: (data: any) => void): void
  setVolume(volume: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  previousTrack(): Promise<void>
  nextTrack(): Promise<void>
  seek(position_ms: number): Promise<void>
}

interface SpotifyPlaybackState {
  context: {
    uri: string
    metadata: any
  }
  disallows: {
    pausing: boolean
    peeking_next: boolean
    peeking_prev: boolean
    resuming: boolean
    seeking: boolean
    skipping_next: boolean
    skipping_prev: boolean
  }
  duration: number
  paused: boolean
  position: number
  repeat_mode: number
  shuffle: boolean
  track_window: {
    current_track: SpotifyTrack
    previous_tracks: SpotifyTrack[]
    next_tracks: SpotifyTrack[]
  }
}

interface SpotifyTrack {
  id: string
  uri: string
  type: string
  media_type: string
  name: string
  is_playable: boolean
  album: {
    uri: string
    name: string
    images: Array<{
      url: string
    }>
  }
  artists: Array<{
    uri: string
    name: string
  }>
}

export function useSpotifyPlayer() {
  const { 
    isAuthenticated, 
    getValidAccessToken, 
    setPlayerState 
  } = useSpotify()
  
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [deviceId, setDeviceId] = useState<string | null>(null)

  // Initialize the player when the SDK is ready and user is authenticated
  useEffect(() => {
    console.log('=== useSpotifyPlayer Debug ===')
    console.log('- Authenticated:', isAuthenticated)
    console.log('- Window Spotify:', typeof window !== 'undefined' && (window as any).Spotify ? 'Available' : 'Not Available')
    console.log('- SDK Ready Callback:', typeof window !== 'undefined' && (window as any).onSpotifyWebPlaybackSDKReady ? 'Set' : 'Not Set')
    console.log('- Current player state:', { isReady, isConnected, deviceId })
    
    if (!isAuthenticated) {
      console.log('❌ Not authenticated, skipping player initialization')
      return
    }

    const initializePlayer = async () => {
      console.log('🎯 Initializing Spotify player...')
      if (typeof window !== 'undefined' && (window as any).Spotify) {
        const accessToken = await getValidAccessToken()
        if (!accessToken) {
          console.log('❌ No valid access token available')
          return
        }

        const newPlayer = new (window as any).Spotify.Player({
          name: 'Music Jeopardy Player',
          getOAuthToken: async (cb: (token: string) => void) => { 
            console.log('🔑 OAuth token requested, providing token...')
            const token = await getValidAccessToken()
            if (token) {
              cb(token) 
            }
          },
          volume: 0.5 // Set initial volume to 0.5
        })

        console.log('✅ Player created successfully')

        // Playback status updates
        newPlayer.addListener('player_state_changed', (state: any) => {
          console.log('🔄 Player state changed:', state ? 'Has state' : 'No state')
          if (state) {
            setCurrentTrack(state.track_window.current_track)
            setIsPlaying(!state.paused)
            setPosition(state.position)
            setDuration(state.duration)
            
            // Update context state
            setPlayerState({
              currentTrack: state.track_window.current_track,
              isPlaying: !state.paused
            })
          }
        })

        // Connection state
        newPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('🎉 Ready with Device ID:', device_id)
          setDeviceId(device_id)
          setIsConnected(true)
          setIsReady(true)
          
          // Update context state
          setPlayerState({
            playerReady: true,
            playerConnected: true
          })
        })

        newPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('❌ Player not ready, device ID:', device_id)
          setIsReady(false)
          setIsConnected(false)
          
          // Update context state
          setPlayerState({
            playerReady: false,
            playerConnected: false
          })
        })

        // Add more detailed error logging
        newPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
          console.error('🚨 Player initialization error:', message)
          setIsReady(false)
          setIsConnected(false)
          
          // Update context state
          setPlayerState({
            playerReady: false,
            playerConnected: false
          })
        })

        newPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
          console.error('🚨 Player authentication error:', message)
          setIsReady(false)
          setIsConnected(false)
          
          // Update context state
          setPlayerState({
            playerReady: false,
            playerConnected: false
          })
        })

        newPlayer.addListener('account_error', ({ message }: { message: string }) => {
          console.error('🚨 Player account error:', message)
          setIsReady(false)
          setIsConnected(false)
          
          // Update context state
          setPlayerState({
            playerReady: false,
            playerConnected: false
          })
        })

        newPlayer.addListener('playback_error', ({ message }: { message: string }) => {
          console.error('🚨 Player playback error:', message)
        })

        setPlayer(newPlayer)
        
        // Try to connect immediately
        setTimeout(() => {
          console.log('🔌 Attempting immediate connection...')
          newPlayer.connect().then((success: boolean) => {
            console.log('🔌 Connection attempt result:', success)
          }).catch((error: any) => {
            console.error('🔌 Connection attempt failed:', error)
          })
        }, 500)
      } else {
        console.log('❌ Spotify SDK not available yet')
      }
    }

    // Check if SDK is already loaded
    if (typeof window !== 'undefined' && (window as any).Spotify) {
      console.log('✅ SDK already loaded, initializing immediately')
      initializePlayer()
    } else {
      console.log('⏳ SDK not loaded, setting up callback')
      // Wait for SDK to load
      ;(window as any).onSpotifyWebPlaybackSDKReady = () => {
        console.log('🎯 SDK ready callback triggered')
        initializePlayer()
      }
    }

    return () => {
      if (player) {
        console.log('🧹 Cleaning up player...')
        player.disconnect()
      }
    }
  }, [isAuthenticated, getValidAccessToken, setPlayerState]) // Removed volume from dependencies

  // Connect to the player
  const connect = useCallback(async () => {
    if (player && !isConnected) {
      console.log('🔌 Attempting to connect to Spotify player...')
      try {
        const success = await player.connect()
        console.log('🔌 Connection result:', success)
        if (success) {
          setIsConnected(true)
          setPlayerState({ playerConnected: true })
          console.log('✅ Successfully connected to Spotify player')
        } else {
          console.log('❌ Failed to connect to Spotify player')
          setIsConnected(false)
          setPlayerState({ playerConnected: false })
        }
        return success
      } catch (error) {
        console.error('🚨 Connection error:', error)
        setIsConnected(false)
        setPlayerState({ playerConnected: false })
        return false
      }
    } else if (player && isConnected) {
      console.log('ℹ️ Already connected to Spotify player')
      return true
    } else {
      console.log('❌ No player available or already connected')
      return false
    }
  }, [player, isConnected, setPlayerState])

  // Disconnect from the player
  const disconnect = useCallback(() => {
    if (player) {
      player.disconnect()
      setIsConnected(false)
      setPlayerState({ playerConnected: false })
    }
  }, [player, setPlayerState])

  // Play a specific track
  const playTrack = useCallback(async (trackUri: string, startPosition: number = 0) => {
    if (player && isConnected && deviceId) {
      try {
        console.log('🎵 Attempting to play track:', trackUri)
        console.log('🎵 Using device ID:', deviceId)
        console.log('🎵 Start position:', startPosition)
        
        const accessToken = await getValidAccessToken()
        if (!accessToken) {
          console.error('❌ No valid access token available')
          return false
        }
        
        // First, try to activate the player
        player.activateElement()
        
        // Use the Spotify Web API to start playback on this device
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: [trackUri],
            position_ms: startPosition
          })
        })
        
        if (response.ok) {
          console.log('✅ Track playback started successfully via Web API')
          return true
        } else {
          const errorData = await response.json()
          console.error('❌ Failed to start playback:', errorData)
          return false
        }
      } catch (error) {
        console.error('🚨 Error playing track:', error)
        return false
      }
    } else {
      console.log('❌ Player not ready, not connected, or no device ID')
      console.log('Player state:', { isConnected, deviceId: !!deviceId, playerReady: !!player })
      return false
    }
  }, [player, isConnected, deviceId, getValidAccessToken])

  // Pause playback
  const pause = useCallback(async () => {
    if (player && isConnected) {
      await player.pause()
    }
  }, [player, isConnected])

  // Resume playback
  const resume = useCallback(async () => {
    if (player && isConnected) {
      await player.resume()
    }
  }, [player, isConnected])

  // Seek to position
  const seek = useCallback(async (positionMs: number) => {
    if (player && isConnected) {
      await player.seek(positionMs)
    }
  }, [player, isConnected])

  // Set volume
  const setPlayerVolume = useCallback(async (newVolume: number) => {
    console.log('🔊 Setting volume to:', newVolume)
    if (player && isConnected) {
      try {
        await player.setVolume(newVolume)
        setVolume(newVolume)
        console.log('✅ Volume set successfully')
      } catch (error) {
        console.error('🚨 Error setting volume:', error)
      }
    } else {
      console.log('⚠️ Cannot set volume - player not ready or not connected')
      // Still update local state for UI consistency
      setVolume(newVolume)
    }
  }, [player, isConnected])

  // Handle volume changes when player is connected
  useEffect(() => {
    if (player && isConnected) {
      console.log('🔊 Updating player volume to:', volume)
      player.setVolume(volume).catch(error => {
        console.error('🚨 Error updating volume:', error)
      })
    }
  }, [volume, player, isConnected])

  return {
    player,
    isReady,
    isConnected,
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    connect,
    disconnect,
    playTrack,
    pause,
    resume,
    seek,
    setVolume: setPlayerVolume
  }
} 