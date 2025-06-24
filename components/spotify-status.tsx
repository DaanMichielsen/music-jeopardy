"use client"

import { Button } from "@/components/ui/button"
import { Music, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useSpotify } from "@/lib/spotify-context"

interface SpotifyStatusProps {
  showUserInfo?: boolean
  variant?: 'compact' | 'full'
  className?: string
}

export function SpotifyStatus({ 
  showUserInfo = false, 
  variant = 'compact',
  className = '' 
}: SpotifyStatusProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    login, 
    logout 
  } = useSpotify()

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
        <span className="text-xs text-slate-400">Loading...</span>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1 text-green-400">
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs">Spotify</span>
        </div>
        
        {showUserInfo && user && variant === 'full' && (
          <span className="text-xs text-slate-400">
            ({user.display_name})
          </span>
        )}
        
        {variant === 'full' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={logout}
            className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            Disconnect
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 text-red-400">
        <XCircle className="h-3 w-3" />
        <span className="text-xs">Spotify</span>
      </div>
      
      <Button
        size="sm"
        variant="outline"
        onClick={login}
        className="h-6 px-2 text-xs border-green-500 text-green-400 hover:bg-green-500/10"
      >
        <Music className="h-3 w-3 mr-1" />
        Connect
      </Button>
    </div>
  )
} 