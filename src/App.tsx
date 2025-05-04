import React from 'react'
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube'
import { atom, useAtom } from 'jotai'

import { useInterval } from '@/hooks'

const SCHEDULE_URL = 'https://gist.githubusercontent.com/yay4ya/223a7744bc0003e4dcef84b60cd9352f/raw/f13963f17980c70365916acf074f623f955dc101/oming.json'

const scheduleDataAtom = atom<Schedule | null>(null)
const scheduleAtom = atom(
  async (get) => {
    const prev = get(scheduleDataAtom)
    if (prev !== null) {
      const now = getCurrentTime()
      if (now < scheduleEnd(prev)) {
        return Promise.resolve(prev)
      }
    }
    const response = await fetch(SCHEDULE_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch schedule')
    }
    return await response.json() as Schedule
  },
  async (get, set) => {
    const prev = get(scheduleDataAtom)
    if (prev !== null) {
      const now = getCurrentTime()
      if (now < scheduleEnd(prev)) {
        return
      }
    }
    const response = await fetch(SCHEDULE_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch schedule')
    }
    const newSchedule = await response.json() as Schedule
    set(scheduleDataAtom, newSchedule)
  }
)

interface Video {
  id: string
  title: string
  duration: string
}

interface ScheduleEntry {
  video: Video
  start: string
}

interface Schedule {
  entries: ScheduleEntry[]
}

function entryStart(entry: ScheduleEntry): Date {
  const startTime = new Date(entry.start)
  if (isNaN(startTime.getTime())) {
    throw new Error(`Invalid start time format: ${entry.start}`)
  }
  return startTime
}

function entryEnd(entry: ScheduleEntry): Date {
  const startTime = entryStart(entry)
  const duration = videoDurationSeconds(entry.video)
  return new Date(startTime.getTime() + duration * 1000)
}

function scheduleEnd(schedule: Schedule): Date {
  const lastEntry = schedule.entries[schedule.entries.length - 1]
  if (!lastEntry) {
    throw new Error('Schedule is empty')
  }
  return entryEnd(lastEntry)
}

function videoDurationSeconds(video: Video): number {
  const duration = video.duration
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`)
  }
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

function getCurrentTime(): Date {
  const now = new Date()
  return now
}

function isLiveEntry(entry: ScheduleEntry): boolean {
  const startTime = entryStart(entry)
  const videoDuration = videoDurationSeconds(entry.video)
  const endTime = new Date(startTime.getTime() + videoDuration * 1000)
  const currentTime = getCurrentTime()
  return currentTime >= startTime && currentTime <= endTime
}

function getLiveEntry(schedule: Schedule): ScheduleEntry | null {
  const liveEntry = schedule.entries.find(isLiveEntry)
  return liveEntry || null
}

function getVideoURL(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

function getThumbnailURL(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
}

function App() {
  const [schedule, refreshSchedule] = useAtom(scheduleAtom)
  const [videoTime, setVideoTime] = React.useState(0)
  const [doSync, setDoSync] = React.useState(false)
  const playerRef = React.useRef<YouTubePlayer | null>(null)

  const liveEntry = React.useMemo(() => {
    if (!schedule) return null
    return getLiveEntry(schedule)
  }, [schedule])

  const getLiveVideoElapsedSeconds = React.useCallback(() => {
    if (!liveEntry) return 0
    const startTime = entryStart(liveEntry)
    const currentTime = getCurrentTime()
    return (currentTime.getTime() - startTime.getTime()) / 1000
  }, [liveEntry])

  const syncVideoTime = React.useCallback(() => {
    if (!playerRef.current) return
    const duration = playerRef.current.getDuration()
    const elapsedSeconds = getLiveVideoElapsedSeconds()
    if (elapsedSeconds > duration) {
      refreshSchedule()
    } else {
      playerRef.current.seekTo(elapsedSeconds)
    }
  }, [getLiveVideoElapsedSeconds, refreshSchedule])

  const handleVideoReady = React.useCallback((event: YouTubeEvent) => {
    playerRef.current = event.target
    setDoSync(true)
  }, [getLiveVideoElapsedSeconds])

  const handleVideoPlay = React.useCallback((_event: YouTubeEvent) => {
    if (doSync) {
      syncVideoTime()
      setDoSync(false)
    }
  }, [doSync, syncVideoTime])

  const handleVideoPause = React.useCallback((_event: YouTubeEvent) => {
    setDoSync(true)
  }, [])

  const handleVideoEnd = React.useCallback(() => {
    refreshSchedule()
  }, [refreshSchedule])

  useInterval(() => {
    setVideoTime(playerRef.current?.getCurrentTime() ?? 0)
  }, 500);

  React.useEffect(() => {
    const liveTime = getLiveVideoElapsedSeconds()
    if (Math.abs(videoTime - liveTime) > 60) {
      syncVideoTime()
    }
  }, [videoTime, getLiveVideoElapsedSeconds])

  return (
    <>
      <div className="w-screen h-screen overflow-hidden flex flex-col">
        {liveEntry ? (
          <>
            <div className="absolute top-0 left-0 w-screen h-screen z-[-1] opacity-40">
              <img
                className="object-cover w-full h-full blur-xl brightness-110"
                src={getThumbnailURL(liveEntry.video.id)}
                alt="Live stream thumbnail"
              />
            </div>
            <div className="w-full h-full">
              <div
                className="w-full h-full aspect-video m-auto"
                style={{
                  maxHeight: 'calc(100vh - 5rem)',
                  maxWidth: 'calc((100vh - 6rem) * 16 / 9)',
                }}
              >
                <YouTube
                  iframeClassName="w-full h-full shadow-2xl rounded-xl aspect-video"
                  className="py-4"
                  style={{
                    width: '100%',
                    margin: 'auto',
                    height: 'calc(100vw * 9 / 16)',
                    maxHeight: 'calc(100vh - 5rem)',
                    maxWidth: 'calc((100vh - 6rem) * 16 / 9)',
                  }}
                  videoId={liveEntry.video.id}
                  opts={{
                    playerVars: {
                      autoplay: 1,
                      controls: 0,
                    },
                  }}
                  onReady={handleVideoReady}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnd={handleVideoEnd}
                />
              </div>
              <div
                className="shrink-0 h-[4rem] flex items-center justify-start rounded-lg m-auto p-4 shadow-2xl bg-white/40 backdrop-blur-3xl border border-white"
                style={{
                  maxWidth: 'calc((100vh - 6rem) * 16 / 9)',
                }}
              >
                <a href={getVideoURL(liveEntry.video.id)} target="_blank" rel="noopener noreferrer">
                  {liveEntry.video.title}
                </a>
                <span className="text-gray-500 text-sm ml-2">
                  {videoTime.toFixed(0)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p>No live stream currently.</p>
        )}
      </div>
    </>
  )
}

export default App
