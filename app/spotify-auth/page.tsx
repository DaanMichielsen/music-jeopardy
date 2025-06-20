"use client"

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { spotifyAuth } from '@/lib/spotify';

function SpotifyAuthPageContent() {
  const searchParams = useSearchParams();
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  } | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const expiresIn = searchParams.get('expires_in');
    const error = searchParams.get('error');

    if (error) {
      setError(error);
      setAuthStatus('error');
      return;
    }

    if (accessToken && refreshToken && expiresIn) {
      setTokens({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: parseInt(expiresIn)
      });
      setAuthStatus('success');
      
      // Store tokens in localStorage (for demo purposes - in production, use secure storage)
      localStorage.setItem('spotify_access_token', accessToken);
      localStorage.setItem('spotify_refresh_token', refreshToken);
      localStorage.setItem('spotify_expires_in', expiresIn);
      localStorage.setItem('spotify_token_timestamp', Date.now().toString());
    }
  }, [searchParams]);

  const handleSpotifyLogin = () => {
    setAuthStatus('loading');
    const authUrl = spotifyAuth.getAuthUrl();
    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-black to-green-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
              <span className="ml-3 text-white">Connecting to Spotify...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-green-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Music className="h-12 w-12 text-green-400" />
            <h1 className="text-4xl font-bold text-white">Spotify Integration</h1>
          </div>
          <p className="text-green-200 text-lg">
            Connect your Spotify account to search for songs and create Music Jeopardy questions
          </p>
        </div>

        {/* Authentication Status */}
        <Card className="bg-black/50 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Music className="h-5 w-5 text-green-400" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {authStatus === 'idle' && (
              <div className="text-center space-y-4">
                <p className="text-green-200">
                  Connect your Spotify account to start searching for songs
                </p>
                <Button 
                  onClick={handleSpotifyLogin}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Music className="h-4 w-4 mr-2" />
                  Connect Spotify Account
                </Button>
              </div>
            )}

            {authStatus === 'success' && tokens && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-400 font-medium">Successfully connected to Spotify!</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-900/20 p-3 rounded-lg">
                    <p className="text-xs text-green-300">Access Token</p>
                    <p className="text-white text-sm font-mono truncate">
                      {tokens.access_token.substring(0, 20)}...
                    </p>
                  </div>
                  <div className="bg-green-900/20 p-3 rounded-lg">
                    <p className="text-xs text-green-300">Refresh Token</p>
                    <p className="text-white text-sm font-mono truncate">
                      {tokens.refresh_token.substring(0, 20)}...
                    </p>
                  </div>
                  <div className="bg-green-900/20 p-3 rounded-lg">
                    <p className="text-xs text-green-300">Expires In</p>
                    <p className="text-white text-sm">
                      {formatDuration(tokens.expires_in * 1000)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => window.location.href = '/game-lobby'}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Go to Game Lobby
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/spotify-search'}
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Search Songs
                  </Button>
                </div>
              </div>
            )}

            {authStatus === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">Authentication failed</span>
                </div>
                
                {error && (
                  <div className="bg-red-900/20 p-3 rounded-lg">
                    <p className="text-red-300 text-sm">Error: {error}</p>
                  </div>
                )}

                <Button 
                  onClick={handleSpotifyLogin}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-black/50 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white">Search Songs</CardTitle>
              <CardDescription className="text-green-200">
                Find any song from Spotify's vast library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-green-200">
                <li>• Search by song title, artist, or album</li>
                <li>• Get 30-second preview clips</li>
                <li>• Access song metadata and audio features</li>
                <li>• Create custom playlists for your game</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white">Game Integration</CardTitle>
              <CardDescription className="text-green-200">
                Use Spotify songs in your Music Jeopardy game
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-green-200">
                <li>• Create questions with real song previews</li>
                <li>• Get song analysis data (tempo, key, energy)</li>
                <li>• Build themed categories from playlists</li>
                <li>• Access millions of songs instantly</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SpotifyAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-black to-green-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
              <span className="ml-3 text-white">Loading Spotify auth...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <SpotifyAuthPageContent />
    </Suspense>
  );
} 