import React from 'react'
import YouTube from 'react-youtube'

const SCHEDULE_URL = 'https://raw.githubusercontent.com/yay4ya/oming/refs/heads/schedule/schedule.json?token=GHSAT0AAAAAADDIE2U2WSC7FI72O5SIA5QE2AWRCDQ'

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
  const [schedule, setSchedule] = React.useState<Schedule>()

  const fetchSchedule = React.useCallback(async () => {
    const response = await fetch(SCHEDULE_URL)
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const data: Schedule = await response.json()
    setSchedule(data)
  }, [])

  React.useEffect(() => {
    fetchSchedule()
  }, [])

  const liveEntry = React.useMemo(() => {
    if (!schedule) return null
    return getLiveEntry(schedule)
  }, [schedule])

  const liveVideoElapsedSeconds = React.useMemo(() => {
    if (!liveEntry) return 0
    const startTime = entryStart(liveEntry)
    const videoDuration = videoDurationSeconds(liveEntry.video)
    const currentTime = getCurrentTime()
    const elapsedSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
    return Math.min(elapsedSeconds, videoDuration)
  }, [liveEntry])


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
                  className="p-4"
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
                      start: liveVideoElapsedSeconds,
                    },
                  }}
                  onPlay={fetchSchedule}
                  onEnd={fetchSchedule}
                />
              </div>
              <div
                className="shrink-0 h-[4rem] flex items-center justify-start rounded-xl m-auto p-4 shadow-2xl bg-white/30 backdrop-blur-3xl border border-gray-100"
                style={{
                  maxWidth: 'calc((100vh - 6rem) * 16 / 9)',
                }}
              >
                <a href={getVideoURL(liveEntry.video.id)} target="_blank" rel="noopener noreferrer">
                  {liveEntry.video.title}
                </a>
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
