"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import SpotifyWebApi from 'spotify-web-api-js'
import { spotifyAuth } from './spotify'

// Types
interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  timestamp: number
}

interface SpotifyUser {
  id: string
  display_name: string
  email: string
  product: string // 'premium', 'free', etc.
  images?: Array<{ url: string; width?: number; height?: number }>
}

interface SpotifyContextType {
  // State
  isAuthenticated: boolean
  isLoading: boolean
  user: SpotifyUser | null
  tokens: SpotifyTokens | null
  api: InstanceType<typeof SpotifyWebApi> | null
  
  // Actions
  login: () => void
  logout: () => void
  refreshTokens: () => Promise<boolean>
  getValidAccessToken: () => Promise<string | null>
  
  // Player state (for SDK integration)
  playerReady: boolean
  playerConnected: boolean
  currentTrack: any
  isPlaying: boolean
  setPlayerState: (state: Partial<{
    playerReady: boolean
    playerConnected: boolean
    currentTrack: any
    isPlaying: boolean
  }>) => void
}

// Create context
const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined)

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'spotify_access_token',
  REFRESH_TOKEN: 'spotify_refresh_token',
  EXPIRES_IN: 'spotify_expires_in',
  TIMESTAMP: 'spotify_token_timestamp',
  RETURN_URL: 'spotify_return_url'
} as const

// Provider component
export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<SpotifyUser | null>(null)
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null)
  const [api, setApi] = useState<InstanceType<typeof SpotifyWebApi> | null>(null)
  
  // Player state
  const [playerReady, setPlayerReady] = useState(false)
  const [playerConnected, setPlayerConnected] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Initialize Spotify API instance
  useEffect(() => {
    const spotifyApi = new SpotifyWebApi()
    setApi(spotifyApi)
  }, [])

  // Load tokens from localStorage on mount
  useEffect(() => {
    const loadTokens = () => {
      try {
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
        const expiresIn = localStorage.getItem(STORAGE_KEYS.EXPIRES_IN)
        const timestamp = localStorage.getItem(STORAGE_KEYS.TIMESTAMP)

        if (accessToken && refreshToken && expiresIn && timestamp) {
          const tokenData: SpotifyTokens = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: parseInt(expiresIn),
            timestamp: parseInt(timestamp)
          }
          
          setTokens(tokenData)
          
          // Check if token is still valid
          if (isTokenValid(tokenData)) {
            setIsAuthenticated(true)
            if (api) {
              api.setAccessToken(accessToken)
            }
          } else {
            // Token expired, try to refresh
            refreshTokens()
          }
        }
      } catch (error) {
        console.error('Error loading tokens:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTokens()
  }, [api])

  // Load user data when authenticated
  useEffect(() => {
    if (isAuthenticated && api && tokens) {
      loadUserData()
    }
  }, [isAuthenticated, api, tokens])

  // Check if token is valid
  const isTokenValid = useCallback((tokenData: SpotifyTokens): boolean => {
    const now = Date.now()
    const expirationTime = tokenData.timestamp + (tokenData.expires_in * 1000)
    return now < expirationTime
  }, [])

  // Load user data from Spotify
  const loadUserData = useCallback(async () => {
    if (!api || !tokens) return

    try {
      const userData = await api.getMe()
      setUser({
        id: userData.id,
        display_name: userData.display_name || '',
        email: userData.email || '',
        product: userData.product || 'free',
        images: userData.images
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      // If we can't load user data, token might be invalid
      if (error instanceof Error && error.message.includes('401')) {
        await refreshTokens()
      }
    }
  }, [api, tokens])

  // Refresh tokens
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    if (!tokens?.refresh_token) {
      setIsAuthenticated(false)
      return false
    }

    try {
      const newTokens = await spotifyAuth.refreshToken(tokens.refresh_token)
      
      const tokenData: SpotifyTokens = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokens.refresh_token, // Keep old refresh token if not provided
        expires_in: newTokens.expires_in,
        timestamp: Date.now()
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token)
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token)
      localStorage.setItem(STORAGE_KEYS.EXPIRES_IN, tokenData.expires_in.toString())
      localStorage.setItem(STORAGE_KEYS.TIMESTAMP, tokenData.timestamp.toString())

      // Update state
      setTokens(tokenData)
      setIsAuthenticated(true)
      
      if (api) {
        api.setAccessToken(tokenData.access_token)
      }

      return true
    } catch (error) {
      console.error('Error refreshing tokens:', error)
      logout()
      return false
    }
  }, [tokens, api])

  // Get valid access token (refreshes if needed)
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null

    if (isTokenValid(tokens)) {
      return tokens.access_token
    }

    // Token expired, try to refresh
    const success = await refreshTokens()
    return success ? tokens.access_token : null
  }, [tokens, isTokenValid, refreshTokens])

  // Login
  const login = useCallback(() => {
    // Store current URL for return after auth
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.RETURN_URL, window.location.href)
    }
    
    // Redirect to auth page
    window.location.href = spotifyAuth.getAuthUrl()
  }, [])

  // Logout
  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_IN)
    localStorage.removeItem(STORAGE_KEYS.TIMESTAMP)
    sessionStorage.removeItem(STORAGE_KEYS.RETURN_URL)

    // Clear state
    setTokens(null)
    setIsAuthenticated(false)
    setUser(null)
    
    if (api) {
      api.setAccessToken('')
    }

    // Reset player state
    setPlayerReady(false)
    setPlayerConnected(false)
    setCurrentTrack(null)
    setIsPlaying(false)
  }, [api])

  // Handle auth callback (called from auth page)
  const handleAuthCallback = useCallback((accessToken: string, refreshToken: string, expiresIn: string) => {
    const tokenData: SpotifyTokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: parseInt(expiresIn),
      timestamp: Date.now()
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token)
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token)
    localStorage.setItem(STORAGE_KEYS.EXPIRES_IN, tokenData.expires_in.toString())
    localStorage.setItem(STORAGE_KEYS.TIMESTAMP, tokenData.timestamp.toString())

    // Update state
    setTokens(tokenData)
    setIsAuthenticated(true)
    
    if (api) {
      api.setAccessToken(accessToken)
    }
  }, [api])

  // Set player state
  const setPlayerState = useCallback((state: Partial<{
    playerReady: boolean
    playerConnected: boolean
    currentTrack: any
    isPlaying: boolean
  }>) => {
    if (state.playerReady !== undefined) setPlayerReady(state.playerReady)
    if (state.playerConnected !== undefined) setPlayerConnected(state.playerConnected)
    if (state.currentTrack !== undefined) setCurrentTrack(state.currentTrack)
    if (state.isPlaying !== undefined) setIsPlaying(state.isPlaying)
  }, [])

  // Handle auth callback from URL hash (for auth page)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const expiresIn = params.get('expires_in')

      if (accessToken && refreshToken && expiresIn) {
        handleAuthCallback(accessToken, refreshToken, expiresIn)
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname)
        
        // Redirect to return URL
        const returnUrl = sessionStorage.getItem(STORAGE_KEYS.RETURN_URL)
        if (returnUrl) {
          sessionStorage.removeItem(STORAGE_KEYS.RETURN_URL)
          window.location.href = returnUrl
        }
      }
    }
  }, [handleAuthCallback])

  const value: SpotifyContextType = {
    // State
    isAuthenticated,
    isLoading,
    user,
    tokens,
    api,
    
    // Actions
    login,
    logout,
    refreshTokens,
    getValidAccessToken,
    
    // Player state
    playerReady,
    playerConnected,
    currentTrack,
    isPlaying,
    setPlayerState
  }

  return (
    <SpotifyContext.Provider value={value}>
      {children}
    </SpotifyContext.Provider>
  )
}

// Hook to use Spotify context
export function useSpotify() {
  const context = useContext(SpotifyContext)
  if (context === undefined) {
    throw new Error('useSpotify must be used within a SpotifyProvider')
  }
  return context
}

// Export storage keys for external use
export { STORAGE_KEYS } 