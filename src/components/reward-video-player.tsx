'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2, Play, RotateCcw } from 'lucide-react'
import { getRewardVideoSource } from '@/lib/video-url'

type ProgressHandler = (positionSeconds: number, isPlaying: boolean, ended?: boolean) => Promise<boolean>
type CompletionHandler = () => Promise<boolean>

type YouTubePlayer = {
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  playVideo: () => void
  destroy: () => void
}
type YouTubeApi = {
  PlayerState: { ENDED: number; PLAYING: number }
  Player: new (element: HTMLIFrameElement, options: {
    events: {
      onReady: (event: { target: YouTubePlayer }) => void
      onStateChange: (event: { data: number; target: YouTubePlayer }) => void
      onError: () => void
    }
  }) => YouTubePlayer
}
type VimeoPlayer = {
  on: (event: 'play' | 'pause' | 'timeupdate' | 'ended', callback: (data?: { seconds?: number }) => void) => void
  getCurrentTime: () => Promise<number>
  setCurrentTime: (seconds: number) => Promise<number>
  play: () => Promise<void>
  destroy: () => Promise<void>
}
type VimeoApi = { Player: new (element: HTMLIFrameElement) => VimeoPlayer }

declare global {
  interface Window {
    YT?: YouTubeApi
    Vimeo?: VimeoApi
    onYouTubeIframeAPIReady?: () => void
    __earniziYouTubeApiPromise?: Promise<YouTubeApi>
    __earniziVimeoApiPromise?: Promise<VimeoApi>
  }
}

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (window.__earniziYouTubeApiPromise) return window.__earniziYouTubeApiPromise

  window.__earniziYouTubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('The YouTube player could not be initialized.'))
    }

    let script = document.querySelector<HTMLScriptElement>('script[data-earnizi-youtube-api]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.earniziYoutubeApi = 'true'
      script.onerror = () => {
        script?.remove()
        reject(new Error('The YouTube player could not be loaded.'))
      }
      document.head.appendChild(script)
    }
  }).catch((error: unknown) => {
    window.__earniziYouTubeApiPromise = undefined
    throw error
  })
  return window.__earniziYouTubeApiPromise
}

function loadVimeoApi(): Promise<VimeoApi> {
  if (window.Vimeo?.Player) return Promise.resolve(window.Vimeo)
  if (window.__earniziVimeoApiPromise) return window.__earniziVimeoApiPromise

  window.__earniziVimeoApiPromise = new Promise<VimeoApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-earnizi-vimeo-api]')
    const script = existingScript ?? document.createElement('script')
    script.addEventListener('load', () => {
      if (window.Vimeo?.Player) resolve(window.Vimeo)
      else reject(new Error('The Vimeo player could not be initialized.'))
    }, { once: true })
    script.addEventListener('error', () => {
      script.remove()
      reject(new Error('The Vimeo player could not be loaded.'))
    }, { once: true })
    if (!existingScript) {
      script.src = 'https://player.vimeo.com/api/player.js'
      script.async = true
      script.dataset.earniziVimeoApi = 'true'
      document.head.appendChild(script)
    }
  }).catch((error: unknown) => {
    window.__earniziVimeoApiPromise = undefined
    throw error
  })
  return window.__earniziVimeoApiPromise
}

export default function RewardVideoPlayer({
  videoUrl,
  title,
  sessionId,
  onProgress,
  onEnded,
}: {
  videoUrl: string
  title: string
  sessionId: string
  onProgress: ProgressHandler
  onEnded: CompletionHandler
}) {
  const source = useMemo(() => getRewardVideoSource(videoUrl), [videoUrl])
  const [origin, setOrigin] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerEnded, setPlayerEnded] = useState(false)
  const [playerError, setPlayerError] = useState('')
  const [playerMessage, setPlayerMessage] = useState('')
  const [playerReady, setPlayerReady] = useState(source.kind === 'file')
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const positionRef = useRef(0)
  const lastAllowedPositionRef = useRef(0)
  const endedRef = useRef(false)
  const playerReaderRef = useRef<(() => number | Promise<number>) | null>(null)
  const restartRef = useRef<(() => void | Promise<void>) | null>(null)
  const onProgressRef = useRef(onProgress)
  const onEndedRef = useRef(onEnded)
  onProgressRef.current = onProgress
  onEndedRef.current = onEnded

  useEffect(() => setOrigin(window.location.origin), [])

  const reportPosition = useCallback((positionSeconds: number, playing: boolean) => {
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0) return
    positionRef.current = positionSeconds
    void onProgressRef.current(positionSeconds, playing).catch(() => {})
  }, [])

  const finishPlayback = useCallback(async (positionSeconds: number) => {
    if (endedRef.current) return
    endedRef.current = true
    setIsPlaying(false)
    setPlayerEnded(true)
    setPlayerMessage('Checking your completed watch…')
    try {
      const verified = await onProgressRef.current(positionSeconds, false, true)
      if (!verified) {
        setPlayerMessage('We could not verify enough playback time yet. Replay the video to finish this reward.')
        return
      }
      const credited = await onEndedRef.current()
      if (!credited) setPlayerMessage('The watch could not be verified. Replay the video and try again.')
    } catch {
      setPlayerMessage('The watch could not be verified. Check your connection and replay the video.')
    }
  }, [])

  useEffect(() => {
    if (source.kind !== 'youtube' || !origin || !iframeRef.current) return
    let disposed = false
    let player: YouTubePlayer | null = null
    setPlayerReady(false)
    setPlayerError('')

    void loadYouTubeApi().then((api) => {
      if (disposed || !iframeRef.current) return
      player = new api.Player(iframeRef.current, {
        events: {
          onReady: (event) => {
            if (disposed) return
            setPlayerReady(true)
            playerReaderRef.current = () => event.target.getCurrentTime()
            restartRef.current = () => {
              event.target.seekTo(0, true)
              event.target.playVideo()
            }
          },
          onStateChange: (event) => {
            const position = event.target.getCurrentTime()
            positionRef.current = position
            if (event.data === api.PlayerState.PLAYING) {
              setIsPlaying(true)
              setPlayerMessage('')
            } else if (event.data === api.PlayerState.ENDED) {
              void finishPlayback(position)
            } else {
              setIsPlaying(false)
              reportPosition(position, false)
            }
          },
          onError: () => setPlayerError('This YouTube video cannot be embedded. Choose a video that allows playback on other sites.'),
        },
      })
    }).catch((error: unknown) => {
      if (!disposed) setPlayerError(error instanceof Error ? error.message : 'The YouTube player could not be loaded.')
    })

    return () => {
      disposed = true
      playerReaderRef.current = null
      restartRef.current = null
      if (player) player.destroy()
    }
  }, [finishPlayback, origin, reportPosition, sessionId, source])

  useEffect(() => {
    if (source.kind !== 'vimeo' || !iframeRef.current) return
    let disposed = false
    let player: VimeoPlayer | null = null
    setPlayerReady(false)
    setPlayerError('')

    void loadVimeoApi().then((api) => {
      if (disposed || !iframeRef.current) return
      player = new api.Player(iframeRef.current)
      playerReaderRef.current = () => player?.getCurrentTime() ?? Promise.resolve(0)
      restartRef.current = async () => {
        await player?.setCurrentTime(0)
        await player?.play()
      }
      player.on('play', () => {
        setIsPlaying(true)
        setPlayerMessage('')
      })
      player.on('pause', (event) => {
        setIsPlaying(false)
        const position = event?.seconds ?? positionRef.current
        reportPosition(position, false)
      })
      player.on('timeupdate', (event) => {
        if (typeof event?.seconds === 'number') positionRef.current = event.seconds
      })
      player.on('ended', (event) => {
        void finishPlayback(event?.seconds ?? positionRef.current)
      })
      void player.getCurrentTime().then(() => {
        if (!disposed) setPlayerReady(true)
      }).catch(() => {
        if (!disposed) setPlayerError('The Vimeo video could not be started. Check its privacy and embed settings.')
      })
    }).catch((error: unknown) => {
      if (!disposed) setPlayerError(error instanceof Error ? error.message : 'The Vimeo player could not be loaded.')
    })

    return () => {
      disposed = true
      playerReaderRef.current = null
      restartRef.current = null
      if (player) void player.destroy()
    }
  }, [finishPlayback, reportPosition, sessionId, source])

  useEffect(() => {
    if (source.kind !== 'file') return
    playerReaderRef.current = () => videoRef.current?.currentTime ?? 0
    restartRef.current = async () => {
      const video = videoRef.current
      if (!video) return
      video.currentTime = 0
      await video.play()
    }
    setPlayerReady(true)
    return () => {
      playerReaderRef.current = null
      restartRef.current = null
    }
  }, [source, sessionId])

  useEffect(() => {
    if (!isPlaying) return
    const interval = window.setInterval(() => {
      const reader = playerReaderRef.current
      if (!reader) return
      void Promise.resolve(reader()).then((position) => {
        if (!Number.isFinite(position) || position < 0) return
        positionRef.current = position
        void onProgressRef.current(position, true).catch(() => {})
      }).catch(() => {})
    }, 5000)
    return () => window.clearInterval(interval)
  }, [isPlaying])

  const replay = async () => {
    endedRef.current = false
    setPlayerEnded(false)
    setPlayerMessage('')
    try {
      await restartRef.current?.()
    } catch {
      setPlayerError('The video could not be restarted. Reload the reward and try again.')
    }
  }

  const iframeSrc = source.kind === 'youtube' && origin
    ? `${source.embedUrl}&origin=${encodeURIComponent(origin)}`
    : source.kind === 'vimeo' ? source.embedUrl : ''

  return (
    <div className="reward-player">
      {source.kind === 'unsupported' ? (
        <div className="reward-player-error"><AlertCircle size={22} /><strong>Unsupported video URL</strong><span>Use a direct MP4, WebM, or Ogg video, or an embeddable YouTube or Vimeo link.</span></div>
      ) : (
        <div className="reward-video-stage">
          {source.kind === 'file' && (
            <video
              ref={videoRef}
              src={source.src}
              controls
              controlsList="nodownload noplaybackrate"
              playsInline
              preload="metadata"
              onPlay={() => { endedRef.current = false; setIsPlaying(true); setPlayerMessage('') }}
              onPause={(event) => { setIsPlaying(false); reportPosition(event.currentTarget.currentTime, false) }}
              onTimeUpdate={(event) => {
                if (event.currentTarget.seeking) return
                const position = event.currentTarget.currentTime
                positionRef.current = position
                lastAllowedPositionRef.current = position
              }}
              onSeeking={(event) => {
                const video = event.currentTarget
                if (Math.abs(video.currentTime - lastAllowedPositionRef.current) > 1.5) video.currentTime = lastAllowedPositionRef.current
              }}
              onRateChange={(event) => { if (event.currentTarget.playbackRate !== 1) event.currentTarget.playbackRate = 1 }}
              onEnded={(event) => { void finishPlayback(event.currentTarget.currentTime) }}
              aria-label={title}
            />
          )}
          {(source.kind === 'youtube' || source.kind === 'vimeo') && (
            iframeSrc ? (
              <iframe
                ref={iframeRef}
                key={`${sessionId}-${iframeSrc}`}
                src={iframeSrc}
                title={title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : null
          )}
          {playerError && <div className="reward-player-overlay"><AlertCircle size={22} /><strong>Video playback unavailable</strong><span>{playerError}</span></div>}
          {!playerReady && !playerError && source.kind !== 'file' && <div className="reward-player-loading"><Loader2 size={23} className="spinner-icon" />Preparing the video player…</div>}
          {playerEnded && <div className="reward-player-overlay reward-player-ended"><strong>Watch verification</strong><span>{playerMessage}</span><button type="button" onClick={() => void replay()}><RotateCcw size={15} /> Replay video</button></div>}
        </div>
      )}
      <div className="reward-player-status">
        <span><Play size={14} fill="currentColor" /> {isPlaying ? 'Video playing' : playerEnded ? 'Video ended' : 'Ready to watch'}</span>
        {!playerReady && !playerError && source.kind !== 'file' && <span><Loader2 size={13} className="spinner-icon" /> Connecting</span>}
      </div>
    </div>
  )
}
