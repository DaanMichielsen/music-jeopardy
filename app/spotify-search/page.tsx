"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, Search, Play, Pause, Loader2, ExternalLink, Plus, Volume2, VolumeX } from 'lucide-react';
import { SpotifyTrack } from '@/lib/spotify';
import { useSpotifyPlayer } from '@/hooks/use-spotify-player';
import { SpotifySDKLoader } from '@/components/spotify-sdk-loader';
import { useSpotify } from '@/lib/spotify-context';
import { SpotifyStatus } from '@/components/spotify-status';

// Add CSS for volume slider
const volumeSliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #22c55e;
    cursor: pointer;
    border: 2px solid #ffffff;
  }
  
  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #22c55e;
    cursor: pointer;
    border: 2px solid #ffffff;
  }
`;

export default function SpotifySearchPage() {
  return (
    <SpotifySDKLoader>
      <SpotifySearchContent />
    </SpotifySDKLoader>
  );
}

function SpotifySearchContent() {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [useSDK, setUseSDK] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const { 
    isAuthenticated, 
    api, 
    user, 
    getValidAccessToken 
  } = useSpotify();

  // Spotify Web Playback SDK
  const {
    isReady: sdkReady,
    isConnected: sdkConnected,
    connect: sdkConnect,
    playTrack: sdkPlayTrack,
    pause: sdkPause,
    setVolume: sdkSetVolume,
  } = useSpotifyPlayer();

  // Test access token function
  const testAccessToken = async () => {
    if (!isAuthenticated) return
    
    try {
      console.log('Testing access token...')
      const accessToken = await getValidAccessToken()
      if (!accessToken) {
        console.error('❌ No valid access token available')
        return
      }
      
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        console.log('✅ Token is valid, user:', userData.display_name)
        
        // Check if user has Premium (required for Web Playback SDK)
        const product = userData.product
        console.log('User product type:', product)
        
        if (product !== 'premium') {
          console.warn('⚠️ User does not have Spotify Premium - Web Playback SDK may not work')
          alert('Spotify Premium is required for full playback. You have: ' + product)
        } else {
          console.log('✅ User has Premium - Web Playback SDK should work')
        }
      } else {
        console.error('❌ Token is invalid:', response.status, response.statusText)
        alert('Access token is invalid. Please re-authenticate.')
      }
    } catch (error) {
      console.error('Error testing token:', error)
    }
  }

  useEffect(() => {
    // Test the token when authenticated
    if (isAuthenticated) {
      setTimeout(testAccessToken, 1000);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Cleanup audio when component unmounts
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audio]);

  // Auto-connect to SDK when ready
  useEffect(() => {
    if (sdkReady && !sdkConnected) {
      console.log('Auto-connecting to Spotify SDK...')
      sdkConnect()
    }
  }, [sdkReady, sdkConnected, sdkConnect])

  const searchTracks = async () => {
    if (!query.trim()) return;

    if (!isAuthenticated) {
      alert("Please connect to Spotify first to search for songs.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const accessToken = await getValidAccessToken()
      if (!accessToken) {
        throw new Error('No valid access token available')
      }

      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query)}&access_token=${accessToken}`
      );
      
      if (!response.ok) {
        throw new Error("Spotify search failed");
      }

      const data = await response.json();
      setTracks(data.tracks || []);
    } catch (error) {
      console.error("Spotify search error:", error);
      setError("Spotify search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (track: SpotifyTrack) => {
    if (currentlyPlaying === track.id) {
      await stopTrack();
      return;
    }

    if (sdkConnected && useSDK) {
      // Use SDK for full playback
      const trackUri = `spotify:track:${track.id}`;
      const success = await sdkPlayTrack(trackUri);
      if (success) {
        setCurrentlyPlaying(track.id);
      }
    } else if (track.preview_url) {
      // Use preview URL for limited playback
      if (audio) {
        audio.pause();
        audio.src = '';
      }

      const newAudio = new Audio(track.preview_url);
      newAudio.volume = isMuted ? 0 : volume;
      
      newAudio.onended = () => {
        setCurrentlyPlaying(null);
      };

      newAudio.play().then(() => {
        setAudio(newAudio);
        setCurrentlyPlaying(track.id);
      }).catch(error => {
        console.error('Error playing preview:', error);
        alert('Could not play preview. Try using the SDK for full playback.');
      });
    } else {
      alert('No preview available for this track. Connect to SDK for full playback.');
    }
  };

  const stopTrack = async () => {
    if (sdkConnected && useSDK) {
      await sdkPause()
    } else if (audio) {
      audio.pause();
      audio.src = '';
    }
    setCurrentlyPlaying(null);
  };

  const togglePlay = async (track: SpotifyTrack) => {
    if (currentlyPlaying === track.id) {
      await stopTrack()
    } else {
      await playTrack(track)
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const addToGame = (track: SpotifyTrack) => {
    // This would integrate with your game system
    console.log('Adding track to game:', track);
    alert(`Added "${track.name}" by ${track.artists.map(a => a.name).join(', ')} to your game!`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-black to-green-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-white">Spotify Authentication Required</CardTitle>
            <CardDescription className="text-green-200">
              You need to connect your Spotify account first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpotifyStatus variant="full" showUserInfo />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-green-900 p-4">
      <style>{volumeSliderStyles}</style>
      
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Spotify Song Search</h1>
            <p className="text-green-200">
              Search for songs to add to your game. {user && `Welcome, ${user.display_name}!`}
            </p>
          </div>
          <SpotifyStatus variant="full" showUserInfo />
        </div>

        {/* Connection Status */}
        <Card className="bg-black/50 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Music className="h-5 w-5 text-green-400" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-green-200">Authentication:</span>
                <Badge variant={isAuthenticated ? "default" : "destructive"}>
                  {isAuthenticated ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-green-200">SDK Status:</span>
                <Badge variant={sdkConnected ? "default" : "secondary"}>
                  {sdkConnected ? "Connected" : sdkReady ? "Ready" : "Loading"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-green-200">Playback Mode:</span>
                <Badge variant="outline">
                  {useSDK ? "Full SDK" : "Preview Only"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-green-200">User Plan:</span>
                <Badge variant={user?.product === 'premium' ? "default" : "secondary"}>
                  {user?.product || 'Unknown'}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setUseSDK(!useSDK)}
                variant="outline"
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
              >
                {useSDK ? "Use Preview" : "Use SDK"}
              </Button>
              
              {sdkReady && !sdkConnected && (
                <Button
                  onClick={sdkConnect}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Connect SDK
                </Button>
              )}
            </div>
            
            {sdkConnected && (
              <div className="mt-4 p-3 bg-green-900/20 rounded-lg">
                <p className="text-green-400 text-sm">
                  ✅ Full playback available! You can play entire songs, not just previews.
                </p>
              </div>
            )}
            
            {/* Debug Info */}
            <div className="mt-4 p-3 bg-slate-900/20 rounded-lg">
              <p className="text-slate-300 text-xs">
                <strong>Debug Info:</strong><br/>
                Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}<br/>
                Window Spotify: {typeof window !== 'undefined' && window.Spotify ? '✅ Available' : '❌ Not Available'}<br/>
                SDK Ready: {sdkReady ? '✅ Yes' : '❌ No'}<br/>
                SDK Connected: {sdkConnected ? '✅ Yes' : '❌ No'}<br/>
                Current Mode: {useSDK ? 'SDK' : 'Preview'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <Card className="bg-black/50 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Search for songs, artists, or albums..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchTracks()}
                className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Button 
                onClick={searchTracks}
                disabled={loading || !query.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Volume Control */}
        <Card className="bg-black/50 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-green-200 text-sm">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="slider flex-1"
              />
              <span className="text-green-200 text-sm w-12">{Math.round(volume * 100)}%</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMuted(!isMuted)}
                className="border-green-500 text-green-400 hover:bg-green-500/10"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {tracks.length > 0 && (
          <Card className="bg-black/50 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white">
                Search Results ({tracks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-green-500/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {track.album.images[0] && (
                        <img
                          src={track.album.images[0].url}
                          alt={track.album.name}
                          className="w-16 h-16 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{track.name}</h3>
                        <p className="text-slate-400 text-sm truncate">
                          {track.artists.map(a => a.name).join(', ')}
                        </p>
                        <p className="text-slate-500 text-sm truncate">{track.album.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {formatDuration(track.duration_ms)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {track.popularity}% popular
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => togglePlay(track)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {currentlyPlaying === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToGame(track)}
                        className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(track.external_urls.spotify, '_blank')}
                        className="border-slate-500 text-slate-400 hover:bg-slate-500/10"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 