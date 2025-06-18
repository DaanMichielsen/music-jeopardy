"use client"

import type React from "react"

import { useState } from "react"

export function useDragDrop() {
  const [draggedItem, setDraggedItem] = useState<any>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)

  const handleDragStart = (item: any) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverTarget(targetId)
  }

  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  const handleDrop = (e: React.DragEvent, onDrop: (item: any) => void) => {
    e.preventDefault()
    if (draggedItem) {
      onDrop(draggedItem)
    }
    setDraggedItem(null)
    setDragOverTarget(null)
  }

  return {
    draggedItem,
    dragOverTarget,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
