"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { spotifyAuth } from "@/lib/spotify"
import { Loader2, Music } from "lucide-react"

export default function SpotifyAuthPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")
    const expiresIn = params.get("expires_in")
    const errorParam = params.get("error")

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`)
      setIsLoading(false)
      return
    }

    if (accessToken) {
      localStorage.setItem("spotify_access_token", accessToken)
      if (refreshToken) {
        localStorage.setItem("spotify_refresh_token", refreshToken)
      }

      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname)

      // Redirect to the original page
      const returnUrl = sessionStorage.getItem("returnUrl")
      if (returnUrl) {
        sessionStorage.removeItem("returnUrl")
        router.push(returnUrl)
      } else {
        // Fallback if no returnUrl is set
        router.push("/lobbies")
      }
    } else {
      setIsLoading(false)
    }
  }, [router])

  const handleLogin = () => {
    setIsLoading(true)
    const returnUrl = sessionStorage.getItem("returnUrl") || "/"
    sessionStorage.setItem("returnUrl", returnUrl)
    window.location.href = spotifyAuth.getAuthUrl()
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-green-400" />
              <p className="text-slate-300">Authenticating with Spotify...</p>
            </div>
          ) : error ? (
            <div className="text-red-400 bg-red-500/10 p-4 rounded-lg">
              <h3 className="font-bold">Authentication Error</h3>
              <p>{error}</p>
              <Button onClick={handleLogin} className="w-full mt-4 bg-green-600 hover:bg-green-700">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
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