import { NextResponse } from 'next/server'
import { spotifyApi } from '@/lib/spotify'

export async function GET() {
  try {
    const token = spotifyApi.getAccessToken()
    if (token) {
      return NextResponse.json({ connected: true })
    }
    return NextResponse.json({ connected: false })
  } catch (error) {
    console.error('Error checking Spotify status:', error)
    return NextResponse.json({ connected: false, error: 'Failed to check Spotify status' }, { status: 500 })
  }
} 