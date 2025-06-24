"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Music, Trash2, ArrowLeft, Play, Search, X, Clock, TrendingUp, GripVertical } from "lucide-react"
import { AudioPlayer } from "@/components/ui/audio-player"
import { createCategory, createQuestion, deleteCategory, reorderQuestions, deleteQuestion, updateCategory } from "@/app/actions"
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from "@/lib/utils"
import type { Category, Question, SpotifyTrack, AudioSnippet } from "../types/game"
import { useSpotify } from '@/lib/spotify-context'
import { SpotifyStatus } from '@/components/spotify-status'

interface QuestionSetupProps {
  gameId: string
  categories: Category[]
  onCategoriesChange: (categories: Category[]) => void
  onBackToLobby: () => void
  onStartGame: () => void
}

// Sortable question component with better animations
function SortableQuestion({ question, children }: { question: Question, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    data: { type: 'question', question }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-all duration-200",
        isDragging && "opacity-30 scale-95 z-10"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 text-slate-400 hover:text-slate-300 transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        {children}
      </div>
    </div>
  );
}

// Droppable category component
function DroppableCategory({ category, children }: { category: Category, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category.id}`,
    data: { type: 'category', categoryId: category.id }
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "bg-slate-800/50 border-slate-700 transition-all duration-200",
        isOver && "border-2 border-purple-400 bg-purple-500/10 shadow-lg"
      )}
    >
      {children}
    </Card>
  );
}

export default function QuestionSetup({
  gameId,
  categories,
  onCategoriesChange,
  onBackToLobby,
  onStartGame,
}: QuestionSetupProps) {
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryGenre, setNewCategoryGenre] = useState("")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    genre: "",
  })
  const [questionForm, setQuestionForm] = useState({
    songName: "",
    artist: "",
    answer: "",
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [audioSnippet, setAudioSnippet] = useState<AudioSnippet | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null)

  const { isAuthenticated, getValidAccessToken } = useSpotify()

  const pointValues = [100, 200, 300, 400, 500]

  const addCategory = async () => {
    if (newCategoryName.trim() && newCategoryGenre.trim()) {
      setIsSaving(true)
      try {
        // Create questions for the new category
        const questions = pointValues.map((points) => ({
          points,
          songName: "",
          artist: "",
          answer: "",
          isAnswered: false,
        }))

        // Save to database
        const savedCategory = await createCategory(newCategoryName.trim(), newCategoryGenre.trim(), questions, gameId)
        
        // Update local state with the saved category
        const newCategory: Category = {
          id: savedCategory.id,
          name: savedCategory.name,
          genre: savedCategory.genre,
          questions: savedCategory.questions.map((q: any) => ({
            id: q.id,
            categoryId: q.categoryId,
            points: q.points,
            songName: q.songName,
            artist: q.artist,
            answer: q.answer,
            isAnswered: q.isAnswered,
            spotifyTrack: q.spotifyTrack,
            audioSnippet: q.audioSnippet,
          })),
        }
        
        onCategoriesChange([...categories, newCategory])
        setNewCategoryName("")
        setNewCategoryGenre("")
      } catch (error) {
        console.error("Failed to create category:", error)
        alert("Failed to create category. Please try again.")
      } finally {
        setIsSaving(false)
      }
    }
  }

  const removeCategory = async (categoryId: string) => {
    setIsSaving(true)
    try {
      await deleteCategory(categoryId)
      onCategoriesChange(categories.filter((c) => c.id !== categoryId))
    } catch (error) {
      console.error("Failed to remove category:", error)
      alert("Failed to remove category. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const updateQuestion = (categoryId: string, questionId: string, updates: Partial<Question>) => {
    const updatedCategories = categories.map((category) =>
      category.id === categoryId
        ? {
            ...category,
            questions: category.questions.map((question) =>
              question.id === questionId ? { ...question, ...updates } : question,
            ),
          }
        : category,
    )
    onCategoriesChange(updatedCategories)
  }

  const searchSpotify = async () => {
    if (!searchQuery.trim()) return

    if (!isAuthenticated) {
      alert("Please connect to Spotify first to search for songs.")
      return
    }

    setIsSearching(true)
    try {
      const accessToken = await getValidAccessToken()
      if (!accessToken) {
        throw new Error('No valid access token available')
      }

      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}&limit=10&access_token=${accessToken}`)
      const data = await response.json()
      
      if (data.tracks) {
        setSearchResults(data.tracks)
      }
    } catch (error) {
      console.error('Error searching Spotify:', error)
      alert('Error searching for songs')
    } finally {
      setIsSearching(false)
    }
  }

  const selectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track)
    setQuestionForm({
      songName: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      answer: "",
    })
    
    // Initialize audio snippet
    setAudioSnippet({
      startTime: 0,
      endTime: Math.min(30000, track.duration_ms), // Default to 30 seconds or full duration
      duration: Math.min(30000, track.duration_ms)
    })
  }

  const saveQuestion = async () => {
    if (editingCategory && editingQuestion && selectedTrack && audioSnippet) {
      setIsSaving(true)
      try {
        const updatedQuestion: Partial<Question> = {
          ...questionForm,
          spotifyTrack: selectedTrack,
          audioSnippet: audioSnippet
        }
        
        // Save to database
        await createQuestion(editingQuestion, updatedQuestion)
        
        // Update local state
        updateQuestion(editingCategory, editingQuestion, updatedQuestion)
        setEditingQuestion(null)
        setEditingCategory(null)
        setQuestionForm({ songName: "", artist: "", answer: "" })
        setSelectedTrack(null)
        setAudioSnippet(null)
        setSearchResults([])
        setSearchQuery("")
      } catch (error) {
        console.error("Failed to save question:", error)
        alert("Failed to save question. Please try again.")
      } finally {
        setIsSaving(false)
      }
    }
  }

  const startEditingQuestion = (categoryId: string, question: Question) => {
    // Check if user has authenticated with Spotify
    if (!isAuthenticated) {
      alert('Je moet eerst inloggen met Spotify om vragen te bewerken. Ga naar de Spotify pagina om in te loggen.')
      return
    }

    setEditingCategory(categoryId)
    setEditingQuestion(question.id)
    setQuestionForm({
      songName: question.songName,
      artist: question.artist,
      answer: question.answer,
    })
    
    // Clear search state
    setSearchResults([])
    setSearchQuery("")
    
    // Restore track data if it exists
    if (question.spotifyTrackId && question.spotifyTrackName && question.spotifyArtistNames) {
      // Create a SpotifyTrack object from the stored data
      const track: SpotifyTrack = {
        id: question.spotifyTrackId,
        name: question.spotifyTrackName,
        artists: JSON.parse(question.spotifyArtistNames).map((name: string) => ({ id: '', name })),
        album: {
          id: '',
          name: question.spotifyAlbumName || '',
          images: question.spotifyAlbumImage ? [{ url: question.spotifyAlbumImage, width: 300, height: 300 }] : []
        },
        preview_url: question.spotifyPreviewUrl || null,
        duration_ms: question.spotifyDurationMs || 0,
        popularity: question.spotifyPopularity || 0,
        external_urls: { spotify: question.spotifyExternalUrl || '' }
      }
      setSelectedTrack(track)
    }
    
    // Restore audio snippet if it exists
    if (question.snippetStartTime !== null && question.snippetStartTime !== undefined && 
        question.snippetEndTime !== null && question.snippetEndTime !== undefined) {
      const snippet: AudioSnippet = {
        startTime: question.snippetStartTime,
        endTime: question.snippetEndTime,
        duration: question.snippetDuration || (question.snippetEndTime - question.snippetStartTime)
      }
      setAudioSnippet(snippet)
    }
  }

  const startEditingCategory = (category: Category) => {
    setEditingCategory(category.id)
    setCategoryForm({
      name: category.name,
      genre: category.genre,
    })
  }

  const isGameReady =
    Array.isArray(categories) && categories.length > 0 &&
    categories.every((category) =>
      category.questions.every(
        (question) => question.songName.trim() && question.artist.trim(),
      ),
    )

  // Handler for reordering questions
  const handleReorderQuestions = async (categoryId: string, oldIndex: number, newIndex: number) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return

    // Create new array with reordered questions
    const newQuestions = arrayMove(category.questions, oldIndex, newIndex)
    
    // Update display order and points for all questions in the category
    const questionOrders = newQuestions.map((question, index) => ({
      id: question.id,
      displayOrder: index,
      points: (index + 1) * 100 // 100, 200, 300, 400, 500
    }))

    // Optimistic update with new points
    const updatedQuestions = newQuestions.map((question, index) => ({
      ...question,
      displayOrder: index,
      points: (index + 1) * 100
    }))

    const updatedCategories = categories.map(c => 
      c.id === categoryId 
        ? { ...c, questions: updatedQuestions }
        : c
    )
    onCategoriesChange(updatedCategories)

    try {
      await reorderQuestions(categoryId, questionOrders)
      console.log('Questions reordered successfully')
    } catch (error) {
      console.error('Error reordering questions:', error)
      // Revert optimistic update on error
      onCategoriesChange(categories)
    }
  }

  const handleDeleteQuestion = async (categoryId: string, questionId: string) => {
    setIsSaving(true)
    try {
      await deleteQuestion(questionId)
      
      // Update local state by removing the question from the category
      const updatedCategories = categories.map(category => 
        category.id === categoryId 
          ? { ...category, questions: category.questions.filter(q => q.id !== questionId) }
          : category
      )
      onCategoriesChange(updatedCategories)
    } catch (error) {
      console.error("Failed to delete question:", error)
      alert("Failed to delete question. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const saveCategory = async () => {
    if (!editingCategory || !categoryForm.name.trim() || !categoryForm.genre.trim()) return
    
    setIsSaving(true)
    try {
      await updateCategory(editingCategory, categoryForm.name.trim(), categoryForm.genre.trim())
      
      // Update local state
      const updatedCategories = categories.map(category => 
        category.id === editingCategory 
          ? { ...category, name: categoryForm.name.trim(), genre: categoryForm.genre.trim() }
          : category
      )
      onCategoriesChange(updatedCategories)
      
      // Reset editing state
      setEditingCategory(null)
      setCategoryForm({ name: "", genre: "" })
    } catch (error) {
      console.error("Failed to update category:", error)
      alert("Failed to update category. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBackToLobby} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar Lobby
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Music className="h-8 w-8 text-purple-400" />
                Vragen opstellen
              </h1>
              <p className="text-slate-300">Maak je eigen muziek categorieën en vragen</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SpotifyStatus variant="compact" />
            <Button onClick={onStartGame} disabled={!isGameReady} className="bg-green-600 hover:bg-green-700 text-white">
              <Play className="h-4 w-4 mr-2" />
              Start spel
            </Button>
          </div>
        </div>

        {/* Add Category */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Voeg nieuwe categorie toe</CardTitle>
            <CardDescription className="text-slate-400">
              Elke categorie moet een muziek genre zijn met 5 vragen van toenemende moeilijkheid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName" className="text-slate-300">
                  Categorie naam
                </Label>
                <Input
                  id="categoryName"
                  placeholder="bijv., 90s Rock"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryGenre" className="text-slate-300">
                  Genre (muziek stijl)
                </Label>
                <Input
                  id="categoryGenre"
                  placeholder="bijv., Rock"
                  value={newCategoryGenre}
                  onChange={(e) => setNewCategoryGenre(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button onClick={addCategory} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              {isSaving ? 'Opslaan...' : 'Categorie toevoegen'}
            </Button>
          </CardContent>
        </Card>

        {/* Categories */}
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={({ active }) => {
            setDraggedQuestionId(active.id as string)
          }}
          onDragEnd={({ active, over }) => {
            setDraggedQuestionId(null)
            
            if (active && over && active.data.current?.type === 'question' && over.data.current?.type === 'question') {
              const questionId = active.id as string
              const overQuestionId = over.id as string
              
              // Find the category containing the dragged question
              const sourceCategory = categories.find(c => c.questions.some(q => q.id === questionId))
              const overCategory = categories.find(c => c.questions.some(q => q.id === overQuestionId))
              
              if (!sourceCategory || !overCategory || sourceCategory.id !== overCategory.id) return
              
              const oldIndex = sourceCategory.questions.findIndex(q => q.id === questionId)
              const newIndex = sourceCategory.questions.findIndex(q => q.id === overQuestionId)
              
              if (oldIndex !== newIndex) {
                handleReorderQuestions(sourceCategory.id, oldIndex, newIndex)
              }
            }
          }}
        >
          <div className="grid gap-6">
            {categories.map((category) => (
              <DroppableCategory key={category.id} category={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingCategory === category.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`category-name-${category.id}`} className="text-slate-300 text-sm">
                                Categorie naam
                              </Label>
                              <Input
                                id={`category-name-${category.id}`}
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                className="bg-slate-700 border-slate-600 text-white h-8"
                                onKeyDown={(e) => e.key === "Enter" && saveCategory()}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`category-genre-${category.id}`} className="text-slate-300 text-sm">
                                Genre
                              </Label>
                              <Input
                                id={`category-genre-${category.id}`}
                                value={categoryForm.genre}
                                onChange={(e) => setCategoryForm(prev => ({ ...prev, genre: e.target.value }))}
                                className="bg-slate-700 border-slate-600 text-white h-8"
                                onKeyDown={(e) => e.key === "Enter" && saveCategory()}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={saveCategory}
                              disabled={isSaving}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isSaving ? 'Opslaan...' : 'Opslaan'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCategory(null)
                                setCategoryForm({ name: "", genre: "" })
                              }}
                              className="border-slate-500 text-slate-300"
                            >
                              Annuleren
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-white">{category.name}</CardTitle>
                          <CardDescription className="text-slate-400">{category.genre}</CardDescription>
                        </div>
                      )}
                    </div>
                    {editingCategory !== category.id && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditingCategory(category)}
                          className="border-slate-500 text-slate-300"
                        >
                          Bewerken
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeCategory(category.id)}
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <SortableContext 
                    items={category.questions.map(q => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid gap-4">
                      {category.questions
                        .sort((a, b) => (a.displayOrder ?? a.points) - (b.displayOrder ?? b.points)) // Sort by display order, fallback to points
                        .map((question) => (
                        <SortableQuestion key={question.id} question={question}>
                          <Card className="bg-slate-700/30 border-slate-600 flex-1">
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <Badge className="bg-yellow-600 text-white">{question.points} points</Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditingQuestion(category.id, question)}
                                  className="border-slate-500 text-slate-300"
                                >
                                  {question.songName ? "Vraag bewerken" : "Vraag toevoegen"} 
                                </Button>
                              </div>

                              {question.songName ? (
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-start gap-3">
                                    {question.spotifyAlbumImage && (
                                      <img
                                        src={question.spotifyAlbumImage}
                                        alt="Album cover"
                                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white">
                                        <strong>Nummer:</strong> {question.songName}
                                      </p>
                                      <p className="text-white">
                                        <strong>Artiest:</strong> {question.artist}
                                      </p>
                                      <p className="text-slate-300">
                                        <strong>Hints:</strong> {question.answer}
                                      </p>
                                      {question.spotifyTrackId && (
                                        <div className="flex items-center gap-2 text-green-400 mt-1">
                                          <Music className="h-3 w-3" />
                                          <span className="text-xs">Spotify: {question.spotifyTrackName}</span>
                                        </div>
                                      )}
                                      {question.snippetDuration && (
                                        <div className="flex items-center gap-2 text-blue-400 mt-1">
                                          <Clock className="h-3 w-3" />
                                          <span className="text-xs">
                                            Snippet: {Math.round(question.snippetStartTime! / 1000)}s - {Math.round(question.snippetEndTime! / 1000)}s 
                                            ({Math.round(question.snippetDuration / 1000)}s)
                                          </span>
                                        </div>
                                      )}
                                      {question.spotifyPopularity && (
                                        <div className="flex items-center gap-2 text-purple-400 mt-1">
                                          <TrendingUp className="h-3 w-3" />
                                          <span className="text-xs">Popularity: {question.spotifyPopularity}/100</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-slate-400">
                                  <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Geen vraag toegevoegd</p>
                                  <p className="text-xs">Klik om een nummer te zoeken</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </SortableQuestion>
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </DroppableCategory>
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {draggedQuestionId ? (
              <Card className="bg-slate-700/90 border-2 border-purple-400 shadow-lg transform rotate-2 w-96">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-yellow-600 text-white">Moving...</Badge>
                  </div>
                  <div className="text-center text-slate-400">
                    <Music className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Drop to reorder</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Question Edit Modal */}
        {editingQuestion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Bewerk vraag</CardTitle>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingQuestion(null)
                      setEditingCategory(null)
                      setQuestionForm({ songName: "", artist: "", answer: "" })
                      setSelectedTrack(null)
                      setAudioSnippet(null)
                      setSearchResults([])
                      setSearchQuery("")
                    }}
                    className="text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="text-slate-400">
                  Zoek een nummer en configureer de audio snippet voor deze vraag
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Spotify Search */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Zoek een nummer</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Zoek een nummer, artiest, of album..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchSpotify()}
                      className="flex-1 bg-slate-700 border-slate-600 text-white"
                    />
                    <Button 
                      onClick={searchSpotify} 
                      disabled={isSearching}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {isSearching ? 'Zoeken...' : 'Zoek'}
                    </Button>
                  </div>

                  {/* Search Results */}
                  {Array.isArray(searchResults) && searchResults.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {searchResults.map((track) => (
                        <div
                          key={track.id}
                          className={`p-3 rounded-lg transition-colors ${
                            selectedTrack?.id === track.id
                              ? 'bg-green-600/20 border border-green-500'
                              : 'bg-slate-700/50 hover:bg-slate-600/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {track.album.images[0] && (
                              <img
                                src={track.album.images[0].url}
                                alt={track.album.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => selectTrack(track)}
                            >
                              <p className="text-white font-medium truncate">{track.name}</p>
                              <p className="text-slate-300 text-sm truncate">
                                {track.artists.map(a => a.name).join(', ')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {track.preview_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // Create a temporary audio element to preview
                                    if (track.preview_url) {
                                      const audio = new Audio(track.preview_url)
                                      audio.play()
                                    }
                                  }}
                                  className="border-green-500 text-green-400 hover:bg-green-500/10"
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant={selectedTrack?.id === track.id ? "default" : "outline"}
                                onClick={() => selectTrack(track)}
                                className={selectedTrack?.id === track.id 
                                  ? "bg-green-600 hover:bg-green-700" 
                                  : "border-slate-500 text-slate-300"
                                }
                              >
                                {selectedTrack?.id === track.id ? 'Geselecteerd' : 'Selecteer'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audio Player and Snippet Configuration */}
                {selectedTrack && audioSnippet && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white">Configureer audio fragment</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-400 border-green-500">
                          {Math.round(audioSnippet.duration / 1000)}s fragment (afspeelduur)
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <AudioPlayer
                        track={selectedTrack}
                        snippet={audioSnippet}
                        onSnippetChange={setAudioSnippet}
                        className="border-0 bg-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Question Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Vraag details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="songName" className="text-slate-300">
                      Nummer naam
                    </Label>
                    <Input
                      id="songName"
                      placeholder="Voer de naam van het nummer in..."
                      value={questionForm.songName}
                      onChange={(e) => setQuestionForm({ ...questionForm, songName: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="artist" className="text-slate-300">
                      Artist
                    </Label>
                    <Input
                      id="artist"
                      placeholder="Enter artist name..."
                      value={questionForm.artist}
                      onChange={(e) => setQuestionForm({ ...questionForm, artist: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="answer" className="text-slate-300">
                      Antwoord/Hints
                    </Label>
                    <Textarea
                      id="answer"
                      placeholder="Voer het antwoord of hints in..."
                      value={questionForm.answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={saveQuestion} 
                    disabled={!selectedTrack || !audioSnippet || !questionForm.songName || !questionForm.artist || isSaving}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? 'Opslaan...' : 'Vraag opslaan'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingQuestion(null)
                      setEditingCategory(null)
                      setQuestionForm({ songName: "", artist: "", answer: "" })
                      setSelectedTrack(null)
                      setAudioSnippet(null)
                      setSearchResults([])
                      setSearchQuery("")
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    Annuleren
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {Array.isArray(categories) && categories.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-slate-400">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Geen categorieën</p>
                <p className="text-sm">Voeg je eerste muziek categorie toe om te beginnen</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
