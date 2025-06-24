"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Music, CheckCircle, XCircle } from "lucide-react"
import { useSpotify } from "@/lib/spotify-context"

export default function SpotifyAuthPage() {
  const router = useRouter()
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    login, 
    logout 
  } = useSpotify()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Get return URL from session storage
      const returnUrl = sessionStorage.getItem('spotify_return_url')
      if (returnUrl) {
        sessionStorage.removeItem('spotify_return_url')
        router.push(returnUrl)
      } else {
        router.push('/lobbies')
      }
    }
  }, [isAuthenticated, isLoading, router])

  const handleLogin = () => {
    login()
  }

  const handleLogout = () => {
    logout()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-800/50 border-slate-700 text-white">
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-400" />
            <p className="text-slate-300">Loading Spotify authentication...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-800/50 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Music className="text-green-400" />
            Spotify Authentication
          </CardTitle>
          <CardDescription className="text-slate-400">
            Connect your Spotify account to power the game.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Connected to Spotify</span>
              </div>
              
              {user && (
                <div className="bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-300 mb-2">Connected as:</p>
                  <p className="text-white font-medium">{user.display_name}</p>
                  <p className="text-slate-400 text-sm">{user.email}</p>
                  <p className="text-slate-400 text-sm">Plan: {user.product}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/lobbies')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Continue to Game
                </Button>
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full border-red-500 text-red-400 hover:bg-red-500/10"
                >
                  Disconnect Spotify
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Not connected to Spotify</span>
              </div>
              
              <p className="text-slate-300">
                To play Music Jeopardy, you need to connect your Spotify account. This allows us to search for songs and play audio previews.
              </p>
              
              <Button onClick={handleLogin} className="w-full bg-green-600 hover:bg-green-700">
                <Music className="h-4 w-4 mr-2" />
                Connect with Spotify
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 