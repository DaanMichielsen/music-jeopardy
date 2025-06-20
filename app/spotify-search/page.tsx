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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [useSDK, setUseSDK] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Spotify Web Playback SDK
  const {
    isReady: sdkReady,
    isConnected: sdkConnected,
    connect: sdkConnect,
    playTrack: sdkPlayTrack,
    pause: sdkPause,
    setVolume: sdkSetVolume,
  } = useSpotifyPlayer(accessToken);

  // Test access token function
  const testAccessToken = async () => {
    if (!accessToken) return
    
    try {
      console.log('Testing access token...')
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
    // Get access token from localStorage
    const token = localStorage.getItem('spotify_access_token');
    if (token) {
      setAccessToken(token);
      // Test the token when it's loaded
      setTimeout(testAccessToken, 1000);
    }
  }, []);

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

  // Update volume when SDK is connected
  useEffect(() => {
    if (sdkConnected) {
      sdkSetVolume(isMuted ? 0 : volume)
    }
  }, [volume, isMuted, sdkConnected, sdkSetVolume])

  // Update preview audio volume
  useEffect(() => {
    if (audio && !sdkConnected) {
      audio.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted, audio, sdkConnected])

  const searchTracks = async () => {
    if (!query.trim() || !accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&access_token=${accessToken}&limit=20`);
      
      if (!response.ok) {
        throw new Error('Failed to search tracks');
      }

      const data = await response.json();
      setTracks(data.tracks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (track: SpotifyTrack) => {
    if (sdkConnected && useSDK) {
      // Use Spotify Web Playback SDK
      console.log('Playing with SDK:', track.name)
      const trackUri = `spotify:track:${track.id}`
      const success = await sdkPlayTrack(trackUri, 0)
      if (success) {
        setCurrentlyPlaying(track.id)
      }
    } else if (track.preview_url) {
      // Use preview URL (fallback)
      console.log('Playing preview:', track.name)
      
      // Stop current audio if playing
      if (audio) {
        audio.pause();
        audio.src = '';
      }

      // Create new audio element
      const newAudio = new Audio(track.preview_url);
      newAudio.volume = isMuted ? 0 : volume;
      newAudio.addEventListener('ended', () => {
        setCurrentlyPlaying(null);
      });

      newAudio.play();
      setAudio(newAudio);
      setCurrentlyPlaying(track.id);
    } else {
      alert('No preview available for this track');
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

  if (!accessToken) {
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
            <Button 
              onClick={() => window.location.href = '/spotify-auth'}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Music className="h-4 w-4 mr-2" />
              Connect Spotify
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SpotifySDKLoader>
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-green-900 p-6">
        <style dangerouslySetInnerHTML={{ __html: volumeSliderStyles }} />
        
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Music className="h-8 w-8 text-green-400" />
              <h1 className="text-3xl font-bold text-white">Spotify Song Search</h1>
            </div>
            <p className="text-green-200">
              Search for songs to use in your Music Jeopardy game
            </p>
          </div>

          {/* SDK Status */}
          <Card className="bg-black/50 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-white font-medium">Spotify Web Playback SDK Status</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`${sdkReady ? 'text-green-400' : 'text-yellow-400'}`}>
                      SDK Ready: {sdkReady ? '✅' : '⏳'}
                    </span>
                    <span className={`${sdkConnected ? 'text-green-400' : 'text-red-400'}`}>
                      Connected: {sdkConnected ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Volume Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-slate-300 hover:text-white"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-20 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #22c55e 0%, #22c55e ${volume * 100}%, #475569 ${volume * 100}%, #475569 100%)`
                      }}
                    />
                    <span className="text-xs text-slate-300 w-8">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                  
                  <Button
                    onClick={() => setUseSDK(!useSDK)}
                    disabled={!sdkConnected}
                    variant={useSDK ? "default" : "outline"}
                    className={useSDK ? "bg-green-600 hover:bg-green-700" : "border-green-500 text-green-400"}
                  >
                    {useSDK ? 'Using SDK' : 'Use Preview'}
                  </Button>
                  
                  <Button
                    onClick={testAccessToken}
                    variant="outline"
                    className="border-blue-500 text-blue-400"
                  >
                    Test Token
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
                  Access Token: {accessToken ? '✅ Present' : '❌ Missing'}<br/>
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
                  placeholder="Search for songs, artists, or albums..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchTracks()}
                  className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                />
                <Button 
                  onClick={searchTracks}
                  disabled={loading || !query.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="bg-red-900/20 border-red-500/20">
              <CardContent className="pt-6">
                <p className="text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          {Array.isArray(tracks) && tracks.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">
                Search Results ({Array.isArray(tracks) ? tracks.length : 0} tracks)
              </h2>
              
              <div className="grid gap-4">
                {tracks && tracks.map((track) => (
                  <Card key={track.id} className="bg-black/50 border-green-500/20 hover:border-green-400/40 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        {/* Album Art */}
                        <div className="flex-shrink-0">
                          <img
                            src={track.album.images[0]?.url || '/placeholder.svg'}
                            alt={track.album.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold truncate">{track.name}</h3>
                          <p className="text-green-300 text-sm truncate">
                            {track.artists.map(a => a.name).join(', ')}
                          </p>
                          <p className="text-slate-400 text-sm truncate">{track.album.name}</p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                              {formatDuration(track.duration_ms)}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                              Popularity: {track.popularity}
                            </Badge>
                            {track.preview_url && (
                              <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                                Preview Available
                              </Badge>
                            )}
                            {sdkConnected && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                                Full Playback
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => togglePlay(track)}
                            variant="outline"
                            size="sm"
                            disabled={!track.preview_url && !sdkConnected}
                            className="border-green-500 text-green-400 hover:bg-green-500/10"
                          >
                            {currentlyPlaying === track.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Button
                            onClick={() => addToGame(track)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            onClick={() => window.open(track.external_urls.spotify, '_blank')}
                            variant="outline"
                            size="sm"
                            className="border-slate-500 text-slate-400 hover:bg-slate-500/10"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && Array.isArray(tracks) && tracks.length === 0 && query && (
            <Card className="bg-black/50 border-green-500/20">
              <CardContent className="pt-6 text-center">
                <p className="text-green-200">No tracks found for "{query}"</p>
                <p className="text-slate-400 text-sm mt-2">Try a different search term</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SpotifySDKLoader>
  );
} 