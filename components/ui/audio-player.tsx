"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { Slider } from './slider'
import { Play, Pause, Volume2, VolumeX, Info } from 'lucide-react'
import { useSpotifyPlayer } from '@/hooks/use-spotify-player'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'
import type { SpotifyTrack, AudioSnippet } from '@/types/game'

interface AudioPlayerProps {
  track: SpotifyTrack
  snippet?: AudioSnippet
  onSnippetChange?: (snippet: AudioSnippet) => void
  className?: string
}

export function AudioPlayer({ track, snippet, onSnippetChange, className }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [usePreview, setUsePreview] = useState(false)
  const [isPlayingSnippet, setIsPlayingSnippet] = useState(false)
  const [snippetPlayTime, setSnippetPlayTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null)
  const snippetStartTimeRef = useRef<number>(0)
  
  // Use Spotify Web Playback SDK with centralized context
  const {
    isReady: sdkReady,
    isConnected: sdkConnected,
    connect: sdkConnect,
    playTrack: sdkPlayTrack,
    pause: sdkPause,
    resume: sdkResume,
    seek: sdkSeek,
    setVolume: sdkSetVolume,
    isPlaying: sdkIsPlaying,
    position: sdkPosition,
    duration: sdkDuration
  } = useSpotifyPlayer()

  // Debug logging
  useEffect(() => {
    console.log('AudioPlayer Debug Info:')
    console.log('- SDK Ready:', sdkReady)
    console.log('- SDK Connected:', sdkConnected)
    console.log('- Window Spotify:', typeof window !== 'undefined' && window.Spotify ? 'Available' : 'Not Available')
  }, [sdkReady, sdkConnected])

  // Initialize snippet if not provided
  const defaultSnippet: AudioSnippet = {
    startTime: 0,
    endTime: Math.min(30000, track.duration_ms), // Default to 30 seconds or full duration
    duration: Math.min(30000, track.duration_ms)
  }

  const currentSnippet = snippet || defaultSnippet

  // Connect to SDK when component mounts
  useEffect(() => {
    if (sdkReady && !sdkConnected) {
      console.log('Auto-connecting to Spotify player...')
      sdkConnect()
    }
  }, [sdkReady, sdkConnected, sdkConnect])

  // Use SDK state when connected, fallback to preview
  useEffect(() => {
    if (sdkConnected) {
      setIsPlaying(sdkIsPlaying)
      setCurrentTime(sdkPosition)
      setDuration(sdkDuration)
      setUsePreview(false)
      
      // Log SDK state for debugging
      if (sdkIsPlaying && isPlayingSnippet) {
        console.log('🔍 SDK STATE CHECK:', {
          sdkPosition,
          snippetEndTime: currentSnippet?.endTime,
          isPlayingSnippet,
          sdkIsPlaying,
          shouldStop: sdkPosition >= (currentSnippet?.endTime || 0)
        })
      }
      
      // Auto-stop for SDK playback when reaching snippet end
      if (sdkIsPlaying && isPlayingSnippet && currentSnippet && sdkPosition >= (currentSnippet.endTime - 100)) {
        console.log('🔴 SDK AUTO-STOP TRIGGERED:', {
          sdkPosition,
          snippetEndTime: currentSnippet.endTime,
          difference: sdkPosition - currentSnippet.endTime,
          isPlayingSnippet,
          sdkIsPlaying
        })
        sdkPause()
        setIsPlaying(false)
        setIsPlayingSnippet(false)
      }
    } else {
      setUsePreview(true)
    }
  }, [sdkConnected, sdkIsPlaying, sdkPosition, sdkDuration, currentSnippet, sdkPause, isPlayingSnippet])

  // Preview audio handling (fallback)
  useEffect(() => {
    if (usePreview) {
      const audio = audioRef.current
      if (!audio) return

      const updateTime = () => {
        setCurrentTime(audio.currentTime * 1000) // Convert to milliseconds
      }

      const updateDuration = () => {
        setDuration(audio.duration * 1000) // Convert to milliseconds
      }

      const handleCanPlay = () => {
        setIsLoading(false)
      }

      const handleLoadStart = () => {
        setIsLoading(true)
      }

      const handleError = (e: Event) => {
        console.error('Audio error:', e)
        setIsLoading(false)
        setIsPlaying(false)
      }

      audio.addEventListener('timeupdate', updateTime)
      audio.addEventListener('loadedmetadata', updateDuration)
      audio.addEventListener('canplay', handleCanPlay)
      audio.addEventListener('loadstart', handleLoadStart)
      audio.addEventListener('ended', () => setIsPlaying(false))
      audio.addEventListener('error', handleError)

      return () => {
        audio.removeEventListener('timeupdate', updateTime)
        audio.removeEventListener('loadedmetadata', updateDuration)
        audio.removeEventListener('canplay', handleCanPlay)
        audio.removeEventListener('loadstart', handleLoadStart)
        audio.removeEventListener('ended', () => setIsPlaying(false))
        audio.removeEventListener('error', handleError)
      }
    }
  }, [usePreview])

  useEffect(() => {
    if (usePreview) {
      const audio = audioRef.current
      if (!audio) return
      audio.volume = isMuted ? 0 : volume
    } else if (sdkConnected) {
      sdkSetVolume(isMuted ? 0 : volume)
    }
  }, [volume, isMuted, usePreview, sdkConnected, sdkSetVolume])

  const togglePlay = async () => {
    console.log('🎮 MAIN PLAY TOGGLE:', { isPlaying, isPlayingSnippet, sdkConnected, usePreview })
    
    // Don't allow main player to interfere when playing a snippet
    if (isPlayingSnippet) {
      console.log('⚠️ MAIN PLAYER BLOCKED - snippet is playing')
      return
    }
    
    if (sdkConnected && !usePreview) {
      // Use Spotify Web Playback SDK
      if (isPlaying) {
        console.log('⏸️ MAIN PLAYER PAUSING')
        await sdkPause()
        setIsPlayingSnippet(false)
      } else {
        console.log('▶️ MAIN PLAYER STARTING')
        const trackUri = `spotify:track:${track.id}`
        await sdkPlayTrack(trackUri, currentSnippet.startTime)
        setIsPlayingSnippet(false) // Not playing a snippet when using main play button
      }
    } else {
      // Use preview URL (fallback)
      const audio = audioRef.current
      if (!audio || !track.preview_url) return

      if (isPlaying) {
        console.log('⏸️ MAIN PLAYER PAUSING (PREVIEW)')
        audio.pause()
        setIsPlaying(false)
        setIsPlayingSnippet(false)
      } else {
        console.log('▶️ MAIN PLAYER STARTING (PREVIEW)')
        try {
          setIsLoading(true)
          
          // Set the source if it's not already set
          if (audio.src !== track.preview_url) {
            audio.src = track.preview_url
          }
          
          // Wait for the audio to be ready
          if (audio.readyState < 2) { // HAVE_CURRENT_DATA
            await new Promise((resolve, reject) => {
              audio.addEventListener('canplay', resolve, { once: true })
              audio.addEventListener('error', reject, { once: true })
            })
          }
          
          // Set the start time for the snippet
          if (currentSnippet) {
            audio.currentTime = currentSnippet.startTime / 1000
          }
          
          await audio.play()
          setIsPlaying(true)
          setIsPlayingSnippet(false)
          setIsLoading(false)
        } catch (error) {
          console.error('Error playing audio:', error)
          setIsLoading(false)
          setIsPlaying(false)
        }
      }
    }
  }

  const handleTimeChange = (value: number[]) => {
    const newTime = value[0] * 1000 // Convert to milliseconds
    setCurrentTime(newTime)
    
    if (sdkConnected && !usePreview) {
      sdkSeek(newTime)
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime / 1000
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSnippetStartChange = (value: number[]) => {
    const newStartTime = value[0] * 1000 // Convert to milliseconds
    const newSnippet: AudioSnippet = {
      ...currentSnippet,
      startTime: newStartTime,
      duration: currentSnippet.endTime - newStartTime
    }
    onSnippetChange?.(newSnippet)
  }

  const handleSnippetEndChange = (value: number[]) => {
    const newEndTime = value[0] * 1000 // Convert to milliseconds
    const newSnippet: AudioSnippet = {
      ...currentSnippet,
      endTime: newEndTime,
      duration: newEndTime - currentSnippet.startTime
    }
    onSnippetChange?.(newSnippet)
  }

  const handleConnect = async () => {
    if (sdkReady && !sdkConnected) {
      await sdkConnect()
    }
  }

  const playSnippetPreview = async (snippet: AudioSnippet) => {
    console.log('🎵 SNIPPET PREVIEW START:', snippet)
    
    if (isPlayingSnippet) {
      console.log('⏹️ STOPPING CURRENT SNIPPET')
      // Stop current snippet
      if (sdkConnected && !usePreview) {
        await sdkPause()
      } else if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlayingSnippet(false)
      setIsPlaying(false)
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current)
        stopTimerRef.current = null
      }
      return
    }

    setIsPlayingSnippet(true)
    snippetStartTimeRef.current = Date.now()

    if (sdkConnected && !usePreview) {
      // Use SDK for snippet playback
      console.log('🎵 SDK SNIPPET PLAYBACK')
      const trackUri = `spotify:track:${track.id}`
      await sdkPlayTrack(trackUri, snippet.startTime)
      setIsPlaying(true)
      
      // Set up auto-stop timer
      const snippetDuration = snippet.endTime - snippet.startTime
      stopTimerRef.current = setTimeout(() => {
        console.log('⏹️ SDK SNIPPET AUTO-STOP')
        sdkPause()
        setIsPlaying(false)
        setIsPlayingSnippet(false)
        stopTimerRef.current = null
      }, snippetDuration)
    } else {
      // Use preview URL for snippet playback
      console.log('🎵 PREVIEW SNIPPET PLAYBACK')
      const audio = audioRef.current
      if (!audio || !track.preview_url) {
        console.log('❌ No preview URL available')
        setIsPlayingSnippet(false)
        return
      }

      try {
        setIsLoading(true)
        console.log('🎵 PREVIEW PLAYING:', { 
          startTime: snippet.startTime, 
          endTime: snippet.endTime,
          duration: snippet.duration 
        })
        
        // Set the source if it's not already set
        if (audio.src !== track.preview_url) {
          audio.src = track.preview_url
        }
        
        // Wait for the audio to be ready
        if (audio.readyState < 2) { // HAVE_CURRENT_DATA
          await new Promise((resolve, reject) => {
            audio.addEventListener('canplay', resolve, { once: true })
            audio.addEventListener('error', reject, { once: true })
          })
        }
        
        // Set the start time for the snippet
        audio.currentTime = snippet.startTime / 1000
        console.log('🎵 SET AUDIO TIME:', { 
          currentTime: audio.currentTime, 
          startTimeMs: snippet.startTime 
        })
        
        await audio.play()
        setIsPlaying(true)
        setIsPlayingSnippet(true)
        setIsLoading(false)
        console.log('✅ PREVIEW SNIPPET STARTED')
        
        // Set timer to stop at snippet end
        const snippetDuration = snippet.endTime - snippet.startTime
        console.log('⏰ SETTING STOP TIMER (PREVIEW):', { 
          snippetDuration, 
          stopInMs: snippetDuration
        })
        
        stopTimerRef.current = setTimeout(() => {
          console.log('🔴 TIMER-BASED AUTO-STOP TRIGGERED (PREVIEW)')
          audio.pause()
          setIsPlaying(false)
          setIsPlayingSnippet(false)
          stopTimerRef.current = null
        }, snippetDuration)
        
      } catch (error) {
        console.error('❌ Error playing snippet preview:', error)
        setIsLoading(false)
        setIsPlaying(false)
        setIsPlayingSnippet(false)
      }
    }
  }

  // Log isPlayingSnippet state changes
  useEffect(() => {
    console.log('🔄 isPlayingSnippet changed:', isPlayingSnippet)
  }, [isPlayingSnippet])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current)
      }
    }
  }, [])

  // Performance-optimized timer for snippet play time updates
  useEffect(() => {
    if (!isPlayingSnippet || !currentSnippet) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newPlayTime = Math.min(elapsed, currentSnippet.duration)
      setSnippetPlayTime(newPlayTime)
      
      // Stop updating when we reach the end
      if (elapsed >= currentSnippet.duration) {
        clearInterval(interval)
      }
    }, 100) // Update every 100ms for smooth animation

    return () => clearInterval(interval)
  }, [isPlayingSnippet, currentSnippet])

  return (
    <Card className={`bg-slate-800/50 border-slate-700 ${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* Track Info */}
        <div className="flex items-center gap-3">
          {track.album.images[0] && (
            <img
              src={track.album.images[0].url}
              alt={track.album.name}
              className="w-12 h-12 rounded-md object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{track.name}</h3>
            <p className="text-slate-300 text-sm truncate">
              {track.artists.map(a => a.name).join(', ')}
            </p>
          </div>
        </div>

        {/* Connection Status */}
        {sdkConnected ? (
          <div className="text-green-400 text-sm bg-green-900/20 p-2 rounded">
            ✅ Verbonden met Spotify (Volledige playback beschikbaar)
          </div>
        ) : sdkReady ? (
          <div className="text-yellow-400 text-sm bg-yellow-900/20 p-2 rounded">
            ⚠️ Speler klaar maar niet verbonden
            <Button
              size="sm"
              onClick={handleConnect}
              className="ml-2 bg-green-600 hover:bg-green-700"
            >
              Verbind met Spotify
            </Button>
          </div>
        ) : (
          <div className="text-blue-400 text-sm bg-blue-900/20 p-2 rounded">
            🔄 Spotify SDK laden...
          </div>
        )}

        {/* Audio Element (for preview fallback) */}
        <audio
          ref={audioRef}
          preload="metadata"
          onTimeUpdate={() => {
            const audio = audioRef.current
            if (audio && isPlayingSnippet && currentSnippet && onSnippetChange) {
              const currentTimeMs = audio.currentTime * 1000
              // Stop when we reach or exceed the snippet end time
              if (currentTimeMs >= currentSnippet.endTime) {
                console.log('🔴 PREVIEW AUTO-STOP TRIGGERED:', {
                  currentTimeMs,
                  snippetEndTime: currentSnippet.endTime,
                  difference: currentTimeMs - currentSnippet.endTime,
                  isPlayingSnippet,
                  audioPaused: audio.paused
                })
                audio.pause()
                setIsPlaying(false)
                setIsPlayingSnippet(false)
              } else {
                // Log when we're close to the end time
                if (currentTimeMs >= currentSnippet.endTime - 1000) {
                  console.log('🟡 CLOSE TO END:', {
                    currentTimeMs,
                    snippetEndTime: currentSnippet.endTime,
                    remaining: currentSnippet.endTime - currentTimeMs
                  })
                }
              }
            }
          }}
          onEnded={() => {
            console.log('🔴 AUDIO ENDED EVENT')
            setIsPlaying(false)
            setIsPlayingSnippet(false)
          }}
        />

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={togglePlay}
            disabled={(!track.preview_url && !sdkConnected) || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider
              value={[currentTime]}
              onValueChange={handleTimeChange}
              max={duration}
              step={100}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="text-slate-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="w-20"
            />
          </div>
        </div>

        {/* Preview URL Status */}
        {!track.preview_url && !sdkConnected && (
          <div className="text-amber-400 text-sm bg-amber-900/20 p-2 rounded">
            ⚠️ Geen preview beschikbaar en niet verbonden met Spotify
          </div>
        )}

        {/* Snippet Configuration */}
        {onSnippetChange && (
          <div className="space-y-3 pt-3 border-t border-slate-600">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Audio Snippet configuratie</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Info className="h-4 w-4 text-slate-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-medium">Fragment configuratie tips:</p>
                    <ul className="text-xs space-y-1">
                      <li>• Sleep de groene handgrepen om start- en eindpunten in te stellen</li>
                      <li>• Klik binnen het fragment-bereik om naar die positie te springen</li>
                      <li>• Gebruik de Afspelen fragment knop om je selectie te testen</li>
                      <li>• Kies een uniek deel van het nummer dat spelers kunnen herkennen</li>
                      <li>• Het fragment zal precies van start tot einde afspelen</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Start: {formatTime(currentSnippet.startTime)}</span>
                <span>Einde: {formatTime(currentSnippet.endTime)}</span>
                <span>Duur: {formatTime(currentSnippet.duration)}</span>
              </div>
              
              {/* Custom Range Slider for Snippet */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-300">Snippet bereik</label>
                    <div className="flex items-center gap-2">
                      {isPlayingSnippet && (
                        <span className="text-xs text-green-400">
                          {formatTime(snippetPlayTime)} / {formatTime(currentSnippet.duration)}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (isPlaying) {
                            // Stop playback
                            console.log('🛑 MANUAL STOP TRIGGERED')
                            
                            // Clear the stop timer
                            if (stopTimerRef.current) {
                              clearTimeout(stopTimerRef.current)
                              stopTimerRef.current = null
                              console.log('⏰ STOP TIMER CLEARED')
                            }
                            
                            if (sdkConnected && !usePreview) {
                              sdkPause()
                            } else {
                              const audio = audioRef.current
                              if (audio) {
                                audio.pause()
                                setIsPlaying(false)
                              }
                            }
                            setIsPlayingSnippet(false)
                            setSnippetPlayTime(0)
                          } else {
                            // Play snippet
                            playSnippetPreview(currentSnippet)
                          }
                        }}
                        disabled={!track.preview_url && !sdkConnected}
                        className="border-green-500 text-green-400 hover:bg-green-500/10 h-6 px-2 text-xs"
                      >
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400"></div>
                        ) : isPlaying ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        <span className="ml-1">
                          {isPlaying ? 'Stop' : 'Afspelen'} fragment
                        </span>
                      </Button>
                    </div>
                  </div>
                  <div className="relative h-12 bg-slate-700 rounded-lg overflow-hidden">
                    {/* Full track background */}
                    <div className="absolute inset-0 bg-slate-600 opacity-30"></div>
                    
                    {/* Clickable track area */}
                    <div 
                      className="absolute inset-0 cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const percent = (e.clientX - rect.left) / rect.width
                        const clickTime = Math.floor(percent * track.duration_ms)
                        
                        // If click is within snippet range, play from that position
                        if (clickTime >= currentSnippet.startTime && clickTime <= currentSnippet.endTime) {
                          if (sdkConnected && !usePreview) {
                            sdkSeek(clickTime)
                          } else {
                            const audio = audioRef.current
                            if (audio && track.preview_url) {
                              audio.currentTime = clickTime / 1000
                              audio.play().then(() => {
                                setIsPlaying(true)
                              }).catch(console.error)
                            }
                          }
                        }
                      }}
                    ></div>
                    
                    {/* Snippet range highlight */}
                    <div 
                      className="absolute h-full bg-green-500/60 border border-green-400"
                      style={{
                        left: `${(currentSnippet.startTime / track.duration_ms) * 100}%`,
                        width: `${(currentSnippet.duration / track.duration_ms) * 100}%`
                      }}
                    ></div>
                    
                    {/* Live playing indicator */}
                    {isPlayingSnippet && (
                      <div 
                        className="absolute top-0 w-1 h-full bg-red-400 animate-pulse"
                        style={{
                          left: `${((currentSnippet.startTime + snippetPlayTime) / track.duration_ms) * 100}%`
                        }}
                      ></div>
                    )}
                    
                    {/* Start handle */}
                    <div 
                      className="absolute top-0 w-1 h-full bg-green-400 cursor-ew-resize hover:bg-green-300 transition-colors"
                      style={{ left: `${(currentSnippet.startTime / track.duration_ms) * 100}%` }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        const handle = e.currentTarget
                        const trackElement = handle.parentElement
                        if (!trackElement) return
                        
                        const handleMove = (e: MouseEvent) => {
                          const rect = trackElement.getBoundingClientRect()
                          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                          const newStartTime = Math.floor(percent * track.duration_ms)
                          const newEndTime = Math.max(newStartTime + 1000, currentSnippet.endTime) // Min 1 second
                          
                          const newSnippet: AudioSnippet = {
                            startTime: newStartTime,
                            endTime: newEndTime,
                            duration: newEndTime - newStartTime
                          }
                          onSnippetChange?.(newSnippet)
                        }
                        
                        const handleUp = () => {
                          document.removeEventListener('mousemove', handleMove)
                          document.removeEventListener('mouseup', handleUp)
                        }
                        
                        document.addEventListener('mousemove', handleMove)
                        document.addEventListener('mouseup', handleUp)
                      }}
                    ></div>
                    
                    {/* End handle */}
                    <div 
                      className="absolute top-0 w-1 h-full bg-green-400 cursor-ew-resize hover:bg-green-300 transition-colors"
                      style={{ left: `${(currentSnippet.endTime / track.duration_ms) * 100}%` }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        const handle = e.currentTarget
                        const trackElement = handle.parentElement
                        if (!trackElement) return
                        
                        const handleMove = (e: MouseEvent) => {
                          const rect = trackElement.getBoundingClientRect()
                          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                          const newEndTime = Math.floor(percent * track.duration_ms)
                          const newStartTime = Math.min(newEndTime - 1000, currentSnippet.startTime) // Min 1 second
                          
                          const newSnippet: AudioSnippet = {
                            startTime: newStartTime,
                            endTime: newEndTime,
                            duration: newEndTime - newStartTime
                          }
                          onSnippetChange?.(newSnippet)
                        }
                        
                        const handleUp = () => {
                          document.removeEventListener('mousemove', handleMove)
                          document.removeEventListener('mouseup', handleUp)
                        }
                        
                        document.addEventListener('mousemove', handleMove)
                        document.addEventListener('mouseup', handleUp)
                      }}
                    ></div>
                    
                    {/* Time markers */}
                    <div className="absolute bottom-0 left-0 right-0 h-3 bg-slate-800/50 flex justify-between text-xs text-slate-400 px-1">
                      <span>0:00</span>
                      <span>{formatTime(track.duration_ms)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 