"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Music, Trophy, Eye, Award } from "lucide-react"
import type { Category, Question, Team } from "../types/game"

interface GameBoardProps {
  categories: Category[]
  teams: Team[]
  onCategoriesChange: (categories: Category[]) => void
  onTeamsChange: (teams: Team[]) => void
  onBackToQuestions: () => void
}

export default function GameBoard({
  categories,
  teams,
  onCategoriesChange,
  onTeamsChange,
  onBackToQuestions,
}: GameBoardProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<{ category: Category; question: Question } | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  const selectQuestion = (category: Category, question: Question) => {
    if (!question.isAnswered) {
      setSelectedQuestion({ category, question })
      setShowAnswer(false)
      setIsFlipped(false)
      // Trigger flip animation
      setTimeout(() => setIsFlipped(true), 100)
    }
  }

  const markQuestionAnswered = () => {
    if (selectedQuestion) {
      const updatedCategories = categories.map((category) =>
        category.id === selectedQuestion.category.id
          ? {
              ...category,
              questions: category.questions.map((question) =>
                question.id === selectedQuestion.question.id ? { ...question, isAnswered: true } : question,
              ),
            }
          : category,
      )
      onCategoriesChange(updatedCategories)
      setSelectedQuestion(null)
      setShowAnswer(false)
      setIsFlipped(false)
    }
  }

  const awardPoints = (teamId: string) => {
    if (selectedQuestion) {
      const updatedTeams = teams.map((team) =>
        team.id === teamId ? { ...team, score: team.score + selectedQuestion.question.points } : team,
      )
      onTeamsChange(updatedTeams)
      markQuestionAnswered()
    }
  }

  const closeQuestion = () => {
    markQuestionAnswered()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBackToQuestions} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Setup
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Music className="h-8 w-8 text-purple-400" />
                Music Jeopardy
              </h1>
            </div>
          </div>
        </div>

        {/* Team Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{team.name}</h3>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span className="text-2xl font-bold text-white">{team.score}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Game Board */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="grid gap-4">
              {/* Category Headers */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
                    <Badge variant="outline" className="text-slate-300 border-slate-600">
                      {category.genre}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Question Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="space-y-3">
                    {category.questions.map((question) => (
                      <Button
                        key={question.id}
                        onClick={() => selectQuestion(category, question)}
                        disabled={question.isAnswered}
                        className={`w-full h-16 text-2xl font-bold ${
                          question.isAnswered
                            ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {question.isAnswered ? "✓" : `$${question.points}`}
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Modal */}
        {selectedQuestion && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl">
              <div className="relative w-full h-96 perspective-1000">
                <div
                  className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}
                >
                  {/* Front of card - Points */}
                  <Card className="absolute inset-0 bg-blue-600 border-blue-500 backface-hidden">
                    <CardContent className="flex items-center justify-center h-full">
                      <div className="text-center text-white">
                        <h2 className="text-4xl font-bold mb-4">{selectedQuestion.category.name}</h2>
                        <p className="text-6xl font-bold">${selectedQuestion.question.points}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Back of card - Question content (mirrored) */}
                  <Card className="absolute inset-0 bg-slate-800 border-slate-700 rotate-y-180 backface-hidden">
                    <CardContent className="flex flex-col justify-center h-full p-8 transform scale-x-[-1]">
                      <div className="text-center text-white space-y-6">
                        <Badge className="bg-yellow-600 text-white text-lg px-4 py-2">
                          ${selectedQuestion.question.points}
                        </Badge>
                        <div className="space-y-4">
                          <h3 className="text-2xl font-bold">Song: {selectedQuestion.question.songName}</h3>
                          <p className="text-xl">Artist: {selectedQuestion.question.artist}</p>
                        </div>

                        {showAnswer && (
                          <div className="mt-6 p-4 bg-green-600/20 border border-green-500 rounded-lg">
                            <h4 className="text-lg font-bold text-green-400 mb-2">Answer:</h4>
                            <p className="text-white">{selectedQuestion.question.answer}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3 justify-center mt-8">
                          {!showAnswer ? (
                            <Button onClick={() => setShowAnswer(true)} className="bg-green-600 hover:bg-green-700">
                              <Eye className="h-4 w-4 mr-2" />
                              Show Answer
                            </Button>
                          ) : (
                            <>
                              {teams.map((team) => (
                                <Button
                                  key={team.id}
                                  onClick={() => awardPoints(team.id)}
                                  className={`${team.color} hover:opacity-80 text-white`}
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  Award to {team.name}
                                </Button>
                              ))}
                              <Button
                                onClick={closeQuestion}
                                variant="outline"
                                className="border-slate-600 text-slate-300"
                              >
                                No Points
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}
