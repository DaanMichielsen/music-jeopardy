"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, Search, Loader2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LyricsTestPage() {
  const router = useRouter()
  const [songTitle, setSongTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testSearch = async () => {
    if (!songTitle.trim()) {
      setError("Please enter a song title")
      return
    }

    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songTitle: songTitle.trim(),
          artist: artist.trim() || undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API request failed')
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const testDirectAPI = async () => {
    if (!songTitle.trim()) {
      setError("Please enter a song title")
      return
    }

    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      // Test the STANDS4 API directly
      const params = new URLSearchParams({
        uid: '13394',
        tokenid: 'Wemt9mtqDzGIxnux',
        term: songTitle.trim(),
        format: 'json'
      })

      if (artist.trim()) {
        params.append('artist', artist.trim())
      }

      const response = await fetch(`https://www.stands4.com/services/v2/lyrics.php?${params.toString()}`)
      const data = await response.json()

      setResults({
        apiResponse: data,
        status: response.status,
        statusText: response.statusText,
        url: response.url
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setResults(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Music className="h-8 w-8 text-purple-400" />
                Lyrics API Test
              </h1>
              <p className="text-slate-300">Test the STANDS4 Lyrics API with different queries</p>
            </div>
          </div>
        </div>

        {/* Test Form */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Test Lyrics Search</CardTitle>
            <CardDescription className="text-slate-400">
              Enter a song title and optionally an artist to test the STANDS4 Lyrics API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="songTitle" className="text-slate-300">Song Title *</Label>
                <Input
                  id="songTitle"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="e.g., Rather Lie, Bohemian Rhapsody"
                  className="bg-slate-700 border-slate-600 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && testSearch()}
                />
              </div>
              <div>
                <Label htmlFor="artist" className="text-slate-300">Artist (Optional)</Label>
                <Input
                  id="artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g., The Weeknd, Queen"
                  className="bg-slate-700 border-slate-600 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && testSearch()}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={testSearch}
                disabled={!songTitle.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Test Our API Route
                  </>
                )}
              </Button>
              <Button 
                onClick={testDirectAPI}
                disabled={!songTitle.trim() || isLoading}
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
              >
                Test Direct STANDS4 API
              </Button>
              <Button 
                onClick={clearResults}
                variant="outline"
                className="border-slate-500 text-slate-300"
              >
                Clear Results
              </Button>
            </div>

            {/* Quick Test Buttons */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">Quick Tests:</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSongTitle("Rather Lie")
                    setArtist("The Weeknd")
                  }}
                  className="border-green-500 text-green-400 hover:bg-green-500/10"
                >
                  Rather Lie - The Weeknd
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSongTitle("Bohemian Rhapsody")
                    setArtist("Queen")
                  }}
                  className="border-green-500 text-green-400 hover:bg-green-500/10"
                >
                  Bohemian Rhapsody - Queen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSongTitle("Imagine")
                    setArtist("John Lennon")
                  }}
                  className="border-green-500 text-green-400 hover:bg-green-500/10"
                >
                  Imagine - John Lennon
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSongTitle("Hotel California")
                    setArtist("Eagles")
                  }}
                  className="border-green-500 text-green-400 hover:bg-green-500/10"
                >
                  Hotel California - Eagles
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {error && (
          <Card className="bg-red-900/20 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {results && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">API Response</CardTitle>
              <CardDescription className="text-slate-400">
                Raw response from the STANDS4 Lyrics API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.results && results.results.length > 0 && (
                  <div>
                    <Label className="text-slate-300 text-sm font-medium">
                      Found {results.results.length} lyrics page(s):
                    </Label>
                    <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-600 rounded-lg p-2 bg-slate-900/50 mt-2">
                      {results.results.map((result: any, index: number) => (
                        <div
                          key={index}
                          className="p-2 bg-slate-800/50 border border-slate-600 rounded cursor-pointer hover:bg-slate-700/50 transition-colors"
                          onClick={() => window.open(result.songLink, '_blank')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {result.song}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {result.artist} • {result.album}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="text-xs text-slate-500">Click to open</span>
                              <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Click on any result to open the lyrics page in a new tab.
                    </p>
                  </div>
                )}
                
                <div>
                  <Label className="text-slate-300 text-sm font-medium">Full API Response:</Label>
                  <Textarea
                    value={JSON.stringify(results, null, 2)}
                    readOnly
                    rows={12}
                    className="bg-slate-900 border-slate-600 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 