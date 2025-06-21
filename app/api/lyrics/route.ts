import { NextRequest, NextResponse } from 'next/server';
import { lyricsService } from '@/lib/lyrics';

export async function POST(request: NextRequest) {
  try {
    const { songTitle, artist } = await request.json();

    if (!songTitle) {
      return NextResponse.json(
        { error: 'Missing required field: songTitle' },
        { status: 400 }
      );
    }

    const searchResults = await lyricsService.searchLyrics(songTitle, artist);

    if (searchResults.length === 0) {
      return NextResponse.json(
        { error: 'No lyrics found for this song' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      results: searchResults,
      songTitle,
      artist
    });
  } catch (error) {
    console.error('Lyrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to search lyrics' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Lyrics API is available',
    service: 'STANDS4 Lyrics API'
  });
} 