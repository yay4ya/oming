import React from 'react'
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube'
import { atom, useAtom } from 'jotai'
import { ListVideoIcon, VolumeXIcon, VolumeIcon as Volume0Icon, Volume1Icon, Volume2Icon } from 'lucide-react'

import { useInterval } from '@/hooks'
import iconLarge from '@/assets/icon_large.png'

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

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function VolumeControl({ player, ...props }: React.HTMLProps<HTMLDivElement> & { player?: YouTubePlayer }) {
  const [volume, setVolume] = React.useState(player?.getVolume() ?? 100)
  const [mute, setMute] = React.useState(player?.isMuted() ?? false)
  const [showVolume, setShowVolume] = React.useState(false)

  React.useEffect(() => {
    if (player) {
      setVolume(player.getVolume())
    }
  }, [player])

  const handleVolumeChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(event.target.value, 10)
    setVolume(newVolume)
    if (player && player.g) {
      player.setVolume(newVolume)
    }
  }, [player])

  const VolumeIcon = React.useMemo(() => {
    if (mute) return VolumeXIcon
    if (volume > 66) {
      return Volume2Icon
    } else if (volume > 33) {
      return Volume1Icon
    } else if (volume > 0) {
      return Volume0Icon
    }
    return VolumeXIcon
  }, [volume, mute])

  React.useEffect(() => {
    if (player && player.g) {
      if (mute) player.mute()
      else player.unMute()
    }
  }, [player, mute])

  return (
    <div {...props}>
      <VolumeIcon
        className="w-full h-full z-10 relative cursor-pointer"
        onMouseEnter={() => setShowVolume(true)}
        onClick={() => setMute((prev: boolean) => !prev)}
      />
      <div
        className="relative w-full h-full"
        style={{ display: showVolume ? 'block' : 'none' }}
        onMouseLeave={() => setShowVolume(false)}
      >
        <div className="absolute bottom-1/2 -left-1/2 bg-white/40 rounded-lg backdrop-blur-lg shadow-xl w-fit">
          <input
            type="range"
            min="0"
            max="100"
            value={mute ? 0 : volume}
            disabled={mute}
            onChange={handleVolumeChange}
            className="h-[100px] w-[3rem] cursor-pointer mt-[1rem] mb-[3rem] relative "
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              verticalAlign: 'middle',
            }}
          />
        </div>
      </div>
    </div>
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
                className="shrink-0 h-16 w-full flex items-center justify-start rounded-lg m-auto p-4 shadow-2xl bg-white/40 backdrop-blur-3xl border border-white text-gray-700"
                style={{ maxWidth: 'calc((100vh - 7rem) * 16 / 9)' }}

              >
                <img src={iconLarge} alt="Icon" className="w-12 h-12 mr-4 rounded-lg border border-gray-200" />
                <a href={getVideoURL(liveEntry.video.id)} target="_blank" rel="noopener noreferrer">
                  {liveEntry.video.title}
                </a>
                <div className="flex-1 flex items-center justify-end gap-8">
                  <p className="text-gray-500 mr-1 text-sm">
                    {formatTime(videoTime)} / {formatTime(videoDurationSeconds(liveEntry.video))}
                  </p>
                  <VolumeControl player={playerRef.current} className="w-6 h-6" />
                  <ListVideoIcon className="w-6 h-6 " />
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
