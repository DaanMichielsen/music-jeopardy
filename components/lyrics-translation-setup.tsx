"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, Music, Loader2, Wifi, WifiOff, ArrowLeft, Plus, Trash2 } from "lucide-react"
import { 
  createLyricsTranslationCategory, 
  createLyricsTranslationQuestion,
  getLyricsTranslationCategories,
  deleteLyricsTranslationCategory,
  deleteLyricsTranslationQuestion,
  updateGameType,
  updateGameScreen
} from "@/app/actions/lyrics-translation"
import type { LyricsTranslationCategory, LyricsTranslationQuestion } from "@/types/game"
import type { SpotifyTrack } from "@/types/game"
import { useRouter } from "next/navigation"

interface LyricsTranslationSetupProps {
  gameId: string
  onBackToLobby: () => void
  onStartGame: () => void
}

export default function LyricsTranslationSetup({ gameId, onBackToLobby, onStartGame }: LyricsTranslationSetupProps) {
  const [lyrics, setLyrics] = useState("")
  const [translatedLyrics, setTranslatedLyrics] = useState("")
  const [sourceLanguage, setSourceLanguage] = useState<'en' | 'nl' | 'es' | 'fr'>('en')
  const [targetLanguage, setTargetLanguage] = useState<'en' | 'nl' | 'es' | 'fr'>('nl')
  const [songTitle, setSongTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [points, setPoints] = useState(100)
  const [hint, setHint] = useState("")
  const [categoryName, setCategoryName] = useState("")
  const [categoryDescription, setCategoryDescription] = useState("")
  const [categories, setCategories] = useState<LyricsTranslationCategory[]>([])
  const [currentCategory, setCurrentCategory] = useState<LyricsTranslationCategory | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Spotify search states
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [isFetchingLyrics, setIsFetchingLyrics] = useState(false)
  const [lyricsSearchResults, setLyricsSearchResults] = useState<any[]>([])

  const router = useRouter()

  useEffect(() => {
    loadCategories()

    // Handle Spotify auth callback
    const params = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (accessToken) {
      localStorage.setItem("spotify_access_token", accessToken)
      if (refreshToken) {
        localStorage.setItem("spotify_refresh_token", refreshToken)
      }

      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
    }
  }, [])

  // Check Spotify connection status directly from localStorage
  const isSpotifyConnected = typeof window !== 'undefined' && !!localStorage.getItem('spotify_access_token')

  const loadCategories = async () => {
    try {
      const loadedCategories = await getLyricsTranslationCategories(gameId)
      setCategories(loadedCategories)
    } catch (error) {
      console.error("Failed to load categories:", error)
    }
  }

  const navigateToSpotifyAuth = () => {
    sessionStorage.setItem("returnUrl", window.location.href);
    router.push("/spotify-auth");
  };

  const searchSpotify = async () => {
    if (!searchQuery.trim()) return;

    if (!isSpotifyConnected) {
      alert("Please connect to Spotify first to search for songs.");
      return;
    }

    const accessToken = localStorage.getItem("spotify_access_token");
    if (!accessToken) {
      alert("Spotify token not found. Please re-authenticate.");
      navigateToSpotifyAuth();
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(
          searchQuery
        )}&access_token=${accessToken}`
      );
      if (!response.ok) {
        throw new Error("Spotify search failed");
      }

      const data = await response.json();
      setSearchResults(data.tracks || []);
    } catch (error) {
      console.error("Spotify search error:", error);
      alert("Spotify search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track);
    setSongTitle(track.name);
    setArtist(track.artists.map(a => a.name).join(', '));
    setSearchResults([]);
    setSearchQuery("");
  };

  const fetchLyrics = async () => {
    if (!songTitle.trim()) {
      alert("Please enter a song title first.");
      return;
    }

    setIsFetchingLyrics(true);
    setLyricsSearchResults([]);
    
    try {
      const response = await fetch('/api/lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songTitle: songTitle,
          artist: artist || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search lyrics');
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setLyricsSearchResults(data.results);
      } else {
        alert("No lyrics found for this song.");
      }
    } catch (error) {
      console.error('Error searching lyrics:', error);
      alert(`Failed to search lyrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  const openLyricsPage = (songLink: string) => {
    window.open(songLink, '_blank');
  };

  const translateLyrics = async () => {
    if (!lyrics.trim()) return

    setIsTranslating(true)
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: lyrics,
          sourceLanguage,
          targetLanguage,
        }),
      })

      if (!response.ok) {
        throw new Error('Translation failed')
      }

      const data = await response.json()
      setTranslatedLyrics(data.translatedText)
    } catch (error) {
      console.error('Translation error:', error)
      alert('Translation failed. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  const createCategory = async () => {
    if (!categoryName.trim()) return

    setIsLoading(true)
    try {
      const newCategory = await createLyricsTranslationCategory(
        categoryName,
        categoryDescription || null,
        gameId
      )
      setCategories([...categories, newCategory])
      setCurrentCategory(newCategory)
      setCategoryName("")
      setCategoryDescription("")
    } catch (error) {
      console.error("Failed to create category:", error)
      alert("Failed to create category")
    } finally {
      setIsLoading(false)
    }
  }

  const addQuestion = async () => {
    if (!currentCategory || !lyrics.trim() || !translatedLyrics.trim()) return

    setIsLoading(true)
    try {
      const newQuestion = await createLyricsTranslationQuestion(
        currentCategory.id,
        lyrics,
        translatedLyrics,
        sourceLanguage,
        targetLanguage,
        songTitle || null,
        artist || null,
        points,
        hint || null
      )

      // Update the category with the new question
      const updatedCategories = categories.map(cat => 
        cat.id === currentCategory.id 
          ? { ...cat, questions: [...cat.questions, newQuestion] }
          : cat
      )
      setCategories(updatedCategories)
      setCurrentCategory(updatedCategories.find(cat => cat.id === currentCategory.id) || null)

      // Clear form
      setLyrics("")
      setTranslatedLyrics("")
      setSongTitle("")
      setArtist("")
      setPoints(100)
      setHint("")
      setSelectedTrack(null)
    } catch (error) {
      console.error("Failed to create question:", error)
      alert("Failed to create question")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category and all its questions?")) return

    setIsLoading(true)
    try {
      await deleteLyricsTranslationCategory(categoryId)
      setCategories(categories.filter(cat => cat.id !== categoryId))
      if (currentCategory?.id === categoryId) {
        setCurrentCategory(null)
      }
    } catch (error) {
      console.error("Failed to delete category:", error)
      alert("Failed to delete category")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return

    setIsLoading(true)
    try {
      await deleteLyricsTranslationQuestion(questionId)
      
      // Update categories to remove the deleted question
      const updatedCategories = categories.map(cat => ({
        ...cat,
        questions: cat.questions.filter(q => q.id !== questionId)
      }))
      setCategories(updatedCategories)
      
      if (currentCategory) {
        setCurrentCategory(updatedCategories.find(cat => cat.id === currentCategory.id) || null)
      }
    } catch (error) {
      console.error("Failed to delete question:", error)
      alert("Failed to delete question")
    } finally {
      setIsLoading(false)
    }
  }

  const startGame = async () => {
    if (categories.length === 0) {
      alert("Please create at least one category with questions before starting the game.")
      return
    }

    setIsLoading(true)
    try {
      await updateGameType(gameId, 'lyrics-translation')
      await updateGameScreen(gameId, 'lyrics-game')
      onStartGame()
    } catch (error) {
      console.error("Failed to start game:", error)
      alert("Failed to start game")
    } finally {
      setIsLoading(false)
    }
  }

  const totalQuestions = categories.reduce((total, cat) => total + cat.questions.length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isSpotifyConnected ? (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm">Spotify Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-red-400">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-sm">Spotify Not Connected</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={navigateToSpotifyAuth}
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    <Music className="h-3 w-3 mr-1" />
                    Connect
                  </Button>
                </div>
              )}
            </div>
            <Button onClick={onBackToLobby} variant="outline" className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lobby
            </Button>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white">Lyrics Translation Game Setup</h1>
              <p className="text-slate-300">
                Create categories and questions for the lyrics translation game. Players will translate lyrics between different languages.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Category and Question Creation */}
          <div className="space-y-6">
            {/* Category Creation */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Create Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="categoryName" className="text-slate-300">Category Name</Label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Pop Hits, Rock Classics"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="categoryDescription" className="text-slate-300">Description (Optional)</Label>
                  <Input
                    id="categoryDescription"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Brief description of the category"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <Button 
                  onClick={createCategory} 
                  disabled={!categoryName.trim() || isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? "Creating..." : "Create Category"}
                </Button>
              </CardContent>
            </Card>

            {/* Question Creation */}
            {currentCategory && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Add Question to "{currentCategory.name}"</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Spotify Search */}
                  <div>
                    <Label className="text-slate-300">Search for Song (Optional)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isSpotifyConnected ? "Search for a song on Spotify..." : "Connect to Spotify to search..."}
                        className="bg-slate-700 border-slate-600 text-white"
                        onKeyDown={(e) => e.key === 'Enter' && searchSpotify()}
                        disabled={!isSpotifyConnected}
                      />
                      <Button 
                        onClick={searchSpotify}
                        disabled={!searchQuery.trim() || isSearching || !isSpotifyConnected}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    {!isSpotifyConnected && (
                      <p className="text-xs text-slate-400 mt-1">
                        Connect to Spotify to search for songs and auto-fill song information
                      </p>
                    )}
                    
                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                        {searchResults.map((track) => (
                          <div
                            key={track.id}
                            onClick={() => selectTrack(track)}
                            className="p-2 bg-slate-700/50 border border-slate-600 rounded cursor-pointer hover:bg-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Music className="h-4 w-4 text-green-400" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{track.name}</p>
                                <p className="text-xs text-slate-400 truncate">
                                  {track.artists.map(a => a.name).join(', ')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected Track */}
                    {selectedTrack && (
                      <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4 text-green-400" />
                          <div>
                            <p className="text-sm font-medium text-green-400">{selectedTrack.name}</p>
                            <p className="text-xs text-green-400/70">
                              {selectedTrack.artists.map(a => a.name).join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Source Language</Label>
                      <select
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value as 'en' | 'nl' | 'es' | 'fr')}
                        className="w-full p-2 border rounded-md bg-slate-700 border-slate-600 text-white"
                      >
                        <option value="en">English</option>
                        <option value="nl">Dutch</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Target Language</Label>
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value as 'en' | 'nl' | 'es' | 'fr')}
                        className="w-full p-2 border rounded-md bg-slate-700 border-slate-600 text-white"
                      >
                        <option value="nl">Dutch</option>
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="songTitle" className="text-slate-300">Song Title (Optional)</Label>
                    <Input
                      id="songTitle"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      placeholder="Song title"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="artist" className="text-slate-300">Artist (Optional)</Label>
                    <Input
                      id="artist"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="Artist name"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  {/* Fetch Lyrics Button */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={fetchLyrics}
                      disabled={!songTitle.trim() || isFetchingLyrics}
                      variant="outline"
                      className="flex-1 border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      {isFetchingLyrics ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Fetching Lyrics...
                        </>
                      ) : (
                        <>
                          <Music className="h-4 w-4 mr-2" />
                          Search Lyrics on STANDS4
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Lyrics Search Results */}
                  {lyricsSearchResults.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm font-medium">
                        Found {lyricsSearchResults.length} lyrics page(s):
                      </Label>
                      <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-600 rounded-lg p-2 bg-slate-900/50">
                        {lyricsSearchResults.map((result, index) => (
                          <div
                            key={index}
                            className="p-2 bg-slate-800/50 border border-slate-600 rounded cursor-pointer hover:bg-slate-700/50 transition-colors"
                            onClick={() => openLyricsPage(result.songLink)}
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
                      <p className="text-xs text-slate-400">
                        Click on any result to open the lyrics page in a new tab. Copy the lyrics and paste them below.
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="lyrics" className="text-slate-300">Original Lyrics</Label>
                    <Textarea
                      id="lyrics"
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Paste the original lyrics here or search for lyrics using the button above..."
                      rows={4}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <Button 
                    onClick={translateLyrics} 
                    disabled={!lyrics.trim() || isTranslating}
                    variant="outline"
                    className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/10"
                  >
                    {isTranslating ? "Translating..." : "Translate Lyrics"}
                  </Button>

                  <div>
                    <Label htmlFor="translatedLyrics" className="text-slate-300">Translated Lyrics</Label>
                    <Textarea
                      id="translatedLyrics"
                      value={translatedLyrics}
                      onChange={(e) => setTranslatedLyrics(e.target.value)}
                      placeholder="Translated lyrics will appear here..."
                      rows={4}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="points" className="text-slate-300">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(parseInt(e.target.value) || 100)}
                      min="100"
                      max="500"
                      step="100"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hint" className="text-slate-300">Hint (Optional)</Label>
                    <Input
                      id="hint"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="A helpful hint for players"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <Button 
                    onClick={addQuestion} 
                    disabled={!lyrics.trim() || !translatedLyrics.trim() || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? "Adding..." : "Add Question"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Categories and Questions Display */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Categories & Questions</h2>
              <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                {categories.length} categories, {totalQuestions} questions
              </Badge>
            </div>

            {categories.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 text-center text-slate-400">
                  No categories created yet. Create your first category to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => (
                  <Card key={category.id} className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-white">{category.name}</CardTitle>
                          {category.description && (
                            <p className="text-sm text-slate-400 mt-1">
                              {category.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentCategory(category)}
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                          >
                            Add Question
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteCategory(category.id)}
                            disabled={isLoading}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {category.questions.length === 0 ? (
                        <p className="text-sm text-slate-400">No questions yet</p>
                      ) : (
                        <div className="space-y-3">
                          {category.questions.map((question) => (
                            <div key={question.id} className="border border-slate-600 rounded-lg p-3 bg-slate-700/50">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="border-slate-500 text-slate-300">{question.points} pts</Badge>
                                  <Badge variant="secondary" className="bg-slate-600 text-slate-300">
                                    {question.sourceLanguage.toUpperCase()} → {question.targetLanguage.toUpperCase()}
                                  </Badge>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteQuestion(question.id)}
                                  disabled={isLoading}
                                >
                                  ×
                                </Button>
                              </div>
                              {question.songTitle && (
                                <p className="text-sm font-medium mb-1 text-white">
                                  {question.songTitle} {question.artist && `- ${question.artist}`}
                                </p>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="font-medium text-xs text-slate-400 uppercase tracking-wide">
                                    Original ({question.sourceLanguage})
                                  </p>
                                  <p className="mt-1 text-slate-300">{question.originalLyrics}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-xs text-slate-400 uppercase tracking-wide">
                                    Translation ({question.targetLanguage})
                                  </p>
                                  <p className="mt-1 text-slate-300">{question.translatedLyrics}</p>
                                </div>
                              </div>
                              {question.hint && (
                                <p className="text-xs text-slate-400 mt-2">
                                  Hint: {question.hint}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {categories.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <Button 
                    onClick={startGame} 
                    disabled={totalQuestions === 0 || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isLoading ? "Starting Game..." : "Start Lyrics Translation Game"}
                  </Button>
                  <p className="text-sm text-slate-400 mt-2 text-center">
                    {totalQuestions === 0 
                      ? "Add at least one question to start the game"
                      : `Ready to play with ${totalQuestions} questions across ${categories.length} categories`
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 