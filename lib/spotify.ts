import SpotifyWebApi from 'spotify-web-api-js';

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!

const SPOTIFY_REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? process.env.SPOTIFY_REDIRECT_URI_PROD || 'https://music-jeopardy-git-main-daan-michielsen.vercel.app/api/spotify/callback'
  : process.env.SPOTIFY_REDIRECT_URI_DEV || 'https://9eb9-2a02-1810-440a-6000-f8b3-228a-3482-a5b5.ngrok-free.app/api/spotify/callback';

// Initialize Spotify API
export const spotifyApi = new SpotifyWebApi();

// Spotify authentication functions
export const spotifyAuth = {
  // Generate authorization URL
  getAuthUrl: () => {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'user-top-read',
      'user-read-recently-played',
      // Web Playback SDK scopes
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing'
    ];

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(scopes.join(' '))}&state=${Math.random().toString(36).substring(7)}`;

    console.log(authUrl);

    return authUrl;
  },

  // Exchange authorization code for access token
  exchangeCodeForToken: async (code: string) => {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    return data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string) => {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return data;
  }
};

// Spotify API helper functions
export const spotifyHelpers = {
  // Search for tracks
  searchTracks: async (query: string, limit: number = 20) => {
    try {
      const response = await spotifyApi.searchTracks(query, { limit });
      return response.tracks?.items || [];
    } catch (error) {
      console.error('Error searching tracks:', error);
      return [];
    }
  },

  // Get track details
  getTrack: async (trackId: string) => {
    try {
      const track = await spotifyApi.getTrack(trackId);
      return track;
    } catch (error) {
      console.error('Error getting track:', error);
      return null;
    }
  },

  // Get multiple tracks
  getTracks: async (trackIds: string[]) => {
    try {
      const tracks = await spotifyApi.getTracks(trackIds);
      return tracks.tracks || [];
    } catch (error) {
      console.error('Error getting tracks:', error);
      return [];
    }
  },

  // Get track audio features
  getTrackAudioFeatures: async (trackId: string) => {
    try {
      const features = await spotifyApi.getAudioFeaturesForTrack(trackId);
      return features;
    } catch (error) {
      console.error('Error getting track features:', error);
      return null;
    }
  },

  // Get recommendations based on seed tracks
  getRecommendations: async (seedTracks: string[], limit: number = 20) => {
    try {
      const recommendations = await spotifyApi.getRecommendations({
        seed_tracks: seedTracks.slice(0, 5), // Spotify allows max 5 seed tracks
        limit
      });
      return recommendations.tracks || [];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  },

  // Get user's playlists
  getUserPlaylists: async (limit: number = 50) => {
    try {
      const playlists = await spotifyApi.getUserPlaylists(undefined, { limit });
      return playlists.items || [];
    } catch (error) {
      console.error('Error getting user playlists:', error);
      return [];
    }
  },

  // Get playlist tracks
  getPlaylistTracks: async (playlistId: string, limit: number = 100) => {
    try {
      const tracks = await spotifyApi.getPlaylistTracks(playlistId, { limit });
      return tracks.items || [];
    } catch (error) {
      console.error('Error getting playlist tracks:', error);
      return [];
    }
  }
};

// Types for Spotify data
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  };
  preview_url: string | null;
  duration_ms: number;
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
} 