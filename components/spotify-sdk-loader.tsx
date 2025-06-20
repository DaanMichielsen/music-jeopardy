"use client"

import { useEffect, useState } from 'react'

interface SpotifySDKLoaderProps {
  children: React.ReactNode
}

export function SpotifySDKLoader({ children }: SpotifySDKLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if SDK is already loaded
    if (typeof window !== 'undefined' && window.Spotify) {
      setIsLoaded(true)
      return
    }

    // Check if script is already in the document
    const existingScript = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')
    if (existingScript) {
      setIsLoaded(true)
      return
    }

    // Load the Spotify SDK script
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    
    script.onload = () => {
      console.log('Spotify SDK script loaded successfully')
      setIsLoaded(true)
    }
    
    script.onerror = () => {
      console.error('Failed to load Spotify SDK script')
    }

    document.head.appendChild(script)

    return () => {
      // Clean up script if component unmounts before loading
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // Show loading state or children based on SDK availability
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading Spotify SDK...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 