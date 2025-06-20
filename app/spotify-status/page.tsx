"use client"

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function SpotifyStatusPage() {
  const [tokens, setTokens] = useState<{
    access_token: string;
    refresh_token: string;
    expires_in: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    const accessToken = localStorage.getItem('spotify_access_token');
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    const expiresIn = localStorage.getItem('spotify_expires_in');
    const timestamp = localStorage.getItem('spotify_token_timestamp');

    if (accessToken && refreshToken) {
      setTokens({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn || '0',
        timestamp: timestamp || '0'
      });
    }
  }, []);

  const clearTokens = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_expires_in');
    localStorage.removeItem('spotify_token_timestamp');
    setTokens(null);
  };

  const checkTokenValidity = () => {
    if (!tokens) return false;
    
    const tokenTimestamp = parseInt(tokens.timestamp);
    const expiresIn = parseInt(tokens.expires_in);
    const currentTime = Date.now();
    const expirationTime = tokenTimestamp + (expiresIn * 1000);
    
    return currentTime < expirationTime;
  };

  const isTokenValid = checkTokenValidity();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-green-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Music className="h-8 w-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">Spotify Token Status</h1>
          </div>
        </div>

        <Card className="bg-black/50 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Music className="h-5 w-5 text-green-400" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokens ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {isTokenValid ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span className={`font-medium ${isTokenValid ? 'text-green-400' : 'text-red-400'}`}>
                    {isTokenValid ? 'Valid tokens found!' : 'Tokens expired'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {Math.floor(parseInt(tokens.expires_in) / 60)} minutes
                    </p>
                  </div>
                  <div className="bg-green-900/20 p-3 rounded-lg">
                    <p className="text-xs text-green-300">Created At</p>
                    <p className="text-white text-sm">
                      {new Date(parseInt(tokens.timestamp)).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {isTokenValid && (
                    <Button 
                      onClick={() => window.location.href = '/spotify-search'}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Go to Song Search
                    </Button>
                  )}
                  <Button 
                    onClick={clearTokens}
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    Clear Tokens
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/spotify-auth'}
                    variant="outline"
                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                  >
                    Re-authenticate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 font-medium">No tokens found</span>
                </div>
                <p className="text-green-200">
                  You need to authenticate with Spotify first
                </p>
                <Button 
                  onClick={() => window.location.href = '/spotify-auth'}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Music className="h-4 w-4 mr-2" />
                  Connect Spotify
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 