import React from 'react'
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube'
import { atom, useAtom } from 'jotai'
import { ListVideoIcon } from 'lucide-react'

import { useInterval } from '@/hooks'
import VolumeControl from '@/components/VolumeControl'
import iconLarge from '@/assets/icon_large.png'

const SCHEDULE_URL = 'https://gist.githubusercontent.com/yay4ya/223a7744bc0003e4dcef84b60cd9352f/raw/88e2da4da93aad98aaf9b9e65d8383882e8b0d27/oming.json'

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

function getThumbnailURL(videoId: string, res?: string): string {
  return `https://i.ytimg.com/vi/${videoId}/${res ?? 'maxresdefault'}.jpg`
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatDate(date: Date): string {
  const month = date.getMonth() + 1
  const dt = date.getDate()
  const hours = ('0' + date.getHours()).slice(-2)
  const minutes = ('0' + date.getMinutes()).slice(-2)
  return `${month}/${dt}  ${hours}:${minutes}`
}



function ScheduleList({ schedule, ...props }: React.HTMLProps<HTMLDivElement> & { schedule: Schedule }) {
  const [show, setShow] = React.useState(false)

  const liveEntry = React.useMemo(() => {
    return getLiveEntry(schedule)
  }, [schedule])

  React.useEffect(() => {
    if (show) {
      const liveEntryElement = document.querySelector(`div[data-live="true"]`)
      console.log(liveEntryElement)
      if (liveEntryElement) {
        liveEntryElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [show])

  return (
    <div {...props}>
      <ListVideoIcon
        className="w-6 h-6 cursor-pointer"
        onClick={() => setShow(prev => !prev)}
      />
      <div
        className="fixed bottom-[70px] right-0 w-full max-w-[500px] h-[500px] bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl"
        style={{ display: show ? 'block' : 'none', maxHeight: 'calc(100vh - 150px)' }}
      >
        <div className="relative h-full overflow-y-auto p-4">
          {schedule.entries.map(entry => (
            <div
              key={entry.video.id}
              className={`mt-2 h-[5rem] flex gap-2 items-center px-3 py-2 rounded-lg ${liveEntry?.video.id == entry.video.id ? 'bg-white/50' : ''}`}
              data-live={liveEntry?.video.id == entry.video.id}
            >
              <div className="shrink-0 w-[100px]">
                <img
                  src={getThumbnailURL(entry.video.id, 'default')}
                  className="aspect-video object-cover overflow-hidden rounded-lg"
                  width={100}
                />
              </div>
              <div>
                <div className="text-xs text-gray-600 ml-2">{formatDate(entryStart(entry))}</div>
                <div className="text-sm mt-1 line-clamp-2">{entry.video.title}</div>
              </div>
            </div>

          ))}
        </div>
      </div >
    </div >
  )
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
    setDoSync(true)
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
      <div className="w-screen h-screen relative overflow-hidden flex items-center justify-center">
        {liveEntry ? (
          <>
            <div className="absolute top-0 left-0 w-screen h-screen z-[-1] opacity-40">
              <img
                className="object-cover w-full h-full blur-xl brightness-120"
                src={getThumbnailURL(liveEntry.video.id)}
                alt="Live stream thumbnail"
              />
            </div>
            <div className="w-full h-fit max-h-full max-w-full flex flex-col p-4 gap-4 m-auto">
              <div className="w-full h-full aspect-video overflow-hidden">
                <YouTube
                  className="w-full h-full overflow-hidden"
                  iframeClassName="w-fit h-full rounded-xl aspect-video m-auto overflow-hidden"
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
                className="shrink-0 h-16 w-full flex items-center justify-start rounded-lg m-auto p-4 shadow-2xl bg-white/40 backdrop-blur-3xl border border-white/40 text-gray-700 gap-4"
                style={{ maxWidth: 'calc((100vh - 7rem) * 16 / 9)' }}

              >
                <img src={iconLarge} alt="Icon" className="w-12 h-12 rounded-lg border border-gray-200" />
                <a href={getVideoURL(liveEntry.video.id)} target="_blank" rel="noopener noreferrer" className="line-clamp-1">
                  {liveEntry.video.title}
                </a>
                <div className="flex-1 flex items-center justify-end gap-8">
                  <p className="text-gray-500 mr-1 text-sm text-nowrap w-fit shrink-0 md:block hidden">
                    {formatTime(videoTime)} / {formatTime(videoDurationSeconds(liveEntry.video))}
                  </p>
                  <VolumeControl player={playerRef.current} className="w-6 h-6" />
                  <ScheduleList className="w-6 h-6 " schedule={schedule} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <p>No live stream currently.</p>
        )}
      </div >
    </>
  )
}

export default App
