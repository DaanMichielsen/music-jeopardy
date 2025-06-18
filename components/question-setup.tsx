"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Music, Trash2, ArrowLeft, Play } from "lucide-react"
import type { Category, Question } from "../types/game"

interface QuestionSetupProps {
  categories: Category[]
  onCategoriesChange: (categories: Category[]) => void
  onBackToLobby: () => void
  onStartGame: () => void
}

export default function QuestionSetup({
  categories,
  onCategoriesChange,
  onBackToLobby,
  onStartGame,
}: QuestionSetupProps) {
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryGenre, setNewCategoryGenre] = useState("")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [questionForm, setQuestionForm] = useState({
    songName: "",
    artist: "",
    answer: "",
  })

  const pointValues = [100, 200, 300, 400, 500]

  const addCategory = () => {
    if (newCategoryName.trim() && newCategoryGenre.trim()) {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName.trim(),
        genre: newCategoryGenre.trim(),
        questions: pointValues.map((points) => ({
          id: `${Date.now()}-${points}`,
          categoryId: Date.now().toString(),
          points,
          songName: "",
          artist: "",
          answer: "",
          isAnswered: false,
        })),
      }
      onCategoriesChange([...categories, newCategory])
      setNewCategoryName("")
      setNewCategoryGenre("")
    }
  }

  const removeCategory = (categoryId: string) => {
    onCategoriesChange(categories.filter((c) => c.id !== categoryId))
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

  const saveQuestion = () => {
    if (editingCategory && editingQuestion) {
      updateQuestion(editingCategory, editingQuestion, questionForm)
      setEditingQuestion(null)
      setEditingCategory(null)
      setQuestionForm({ songName: "", artist: "", answer: "" })
    }
  }

  const startEditingQuestion = (categoryId: string, question: Question) => {
    setEditingCategory(categoryId)
    setEditingQuestion(question.id)
    setQuestionForm({
      songName: question.songName,
      artist: question.artist,
      answer: question.answer,
    })
  }

  const isGameReady =
    categories.length > 0 &&
    categories.every((category) =>
      category.questions.every(
        (question) => question.songName.trim() && question.artist.trim() && question.answer.trim(),
      ),
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBackToLobby} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lobby
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Music className="h-8 w-8 text-purple-400" />
                Question Setup
              </h1>
              <p className="text-slate-300">Create your music categories and questions</p>
            </div>
          </div>
          <Button onClick={onStartGame} disabled={!isGameReady} className="bg-green-600 hover:bg-green-700 text-white">
            <Play className="h-4 w-4 mr-2" />
            Start Game
          </Button>
        </div>

        {/* Add Category */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Add New Category</CardTitle>
            <CardDescription className="text-slate-400">
              Each category should be a music genre with 5 questions of increasing difficulty
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName" className="text-slate-300">
                  Category Name
                </Label>
                <Input
                  id="categoryName"
                  placeholder="e.g., 90s Rock"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryGenre" className="text-slate-300">
                  Genre
                </Label>
                <Input
                  id="categoryGenre"
                  placeholder="e.g., Rock"
                  value={newCategoryGenre}
                  onChange={(e) => setNewCategoryGenre(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <Button onClick={addCategory} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="grid gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      {category.name}
                      <Badge variant="outline" className="text-slate-300 border-slate-600">
                        {category.genre}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {category.questions.filter((q) => q.songName && q.artist && q.answer).length}/5 questions
                      completed
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCategory(category.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {category.questions.map((question) => (
                    <Card key={question.id} className="bg-slate-700/30 border-slate-600">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-yellow-600 text-white">{question.points} points</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingQuestion(category.id, question)}
                            className="border-slate-500 text-slate-300"
                          >
                            {question.songName ? "Edit" : "Add"} Question
                          </Button>
                        </div>

                        {question.songName ? (
                          <div className="space-y-2 text-sm">
                            <p className="text-white">
                              <strong>Song:</strong> {question.songName}
                            </p>
                            <p className="text-white">
                              <strong>Artist:</strong> {question.artist}
                            </p>
                            <p className="text-slate-300">
                              <strong>Answer:</strong> {question.answer}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">No question added yet</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Question Edit Modal */}
        {editingQuestion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Edit Question</CardTitle>
                <CardDescription className="text-slate-400">
                  Add the song details and answer for this question
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="songName" className="text-slate-300">
                    Song Name
                  </Label>
                  <Input
                    id="songName"
                    placeholder="Enter song name..."
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
                    Answer/Clue
                  </Label>
                  <Textarea
                    id="answer"
                    placeholder="Enter the answer or additional clues..."
                    value={questionForm.answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveQuestion} className="flex-1 bg-green-600 hover:bg-green-700">
                    Save Question
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingQuestion(null)
                      setEditingCategory(null)
                      setQuestionForm({ songName: "", artist: "", answer: "" })
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {categories.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-slate-400">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No categories yet</p>
                <p className="text-sm">Add your first music category to get started</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
