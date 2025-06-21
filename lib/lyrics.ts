interface LyricsApiResponse {
  result: Array<{
    song: string;
    'song-link': string;
    artist: string;
    'artist-link': string;
    album: string;
    'album-link': string;
  }>;
}

interface LyricsSearchResult {
  song: string;
  songLink: string;
  artist: string;
  artistLink: string;
  album: string;
  albumLink: string;
}

class LyricsService {
  private readonly uid = '13394';
  private readonly token = 'Wemt9mtqDzGIxnux';
  private readonly baseUrl = 'https://www.stands4.com/services/v2/lyrics.php';

  async searchLyrics(songTitle: string, artist?: string): Promise<LyricsSearchResult[]> {
    try {
      const params = new URLSearchParams({
        uid: this.uid,
        tokenid: this.token,
        term: songTitle,
        format: 'json'
      });

      if (artist) {
        params.append('artist', artist);
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Lyrics API request failed: ${response.status}`);
      }

      const data: LyricsApiResponse = await response.json();
      
      if (data.result && Array.isArray(data.result)) {
        return data.result.map(item => ({
          song: item.song,
          songLink: item['song-link'],
          artist: item.artist,
          artistLink: item['artist-link'],
          album: item.album,
          albumLink: item['album-link']
        }));
      }

      return [];
    } catch (error) {
      console.error('Error searching lyrics:', error);
      return [];
    }
  }

  async getLyricsFromLink(songLink: string): Promise<string | null> {
    try {
      const response = await fetch(songLink);
      if (!response.ok) {
        throw new Error(`Failed to fetch lyrics page: ${response.status}`);
      }

      const html = await response.text();
      
      // Extract lyrics from the HTML page
      // This is a basic implementation - you might need to adjust the selector based on the actual HTML structure
      const lyricsMatch = html.match(/<div[^>]*class="[^"]*lyric[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      
      if (lyricsMatch) {
        // Clean up HTML tags and normalize whitespace
        return lyricsMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }

      return null;
    } catch (error) {
      console.error('Error fetching lyrics from link:', error);
      return null;
    }
  }

  async getLyrics(songTitle: string, artist?: string): Promise<string | null> {
    try {
      // First, search for the song to get the lyrics link
      const searchResults = await this.searchLyrics(songTitle, artist);
      
      if (searchResults.length === 0) {
        console.log('No lyrics found for:', songTitle, artist);
        return null;
      }

      // Then fetch the actual lyrics from the song link
      const lyrics = await this.getLyricsFromLink(searchResults[0].songLink);
      
      return lyrics;
    } catch (error) {
      console.error('Error getting lyrics:', error);
      return null;
    }
  }
}

export const lyricsService = new LyricsService(); 