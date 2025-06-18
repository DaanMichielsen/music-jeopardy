import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { updatePlayer } from "@/app/actions"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const gameId = formData.get("gameId") as string
    const playerId = formData.get("playerId") as string

    if (!file || !gameId || !playerId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }

    // Validate file size (max 1MB after compression)
    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 1MB" },
        { status: 400 }
      )
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const filename = `avatars/${gameId}/${playerId}-${timestamp}.${fileExtension}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    })

    // Get current player to preserve name
    const { prisma } = await import("@/lib/prisma")
    const currentPlayer = await prisma.player.findUnique({
      where: { id: playerId }
    })

    if (!currentPlayer) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      )
    }

    // Update player avatar in database
    await updatePlayer(playerId, currentPlayer.name, blob.url)

    // Emit WebSocket event for real-time updates
    try {
      // Send a direct HTTP request to the WebSocket server to emit the event
      const response = await fetch('http://192.168.0.190:3001/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'avatar-updated',
          data: {
            gameId,
            playerId,
            avatarUrl: blob.url
          }
        })
      })
      
      if (response.ok) {
        console.log(`WebSocket event emitted for avatar update: ${playerId}`)
      } else {
        console.error('Failed to emit WebSocket event:', response.status)
      }
    } catch (error) {
      console.error('Failed to emit WebSocket event:', error)
    }

    return NextResponse.json({ 
      success: true, 
      avatarUrl: blob.url,
      fileSize: file.size,
      compressedSize: `${(file.size / 1024).toFixed(1)}KB`
    })

  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
} 