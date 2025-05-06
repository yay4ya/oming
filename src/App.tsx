import React from 'react'
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube'
import { useAtom } from 'jotai'

import { useInterval } from '@/hooks'
import VolumeControl from '@/components/VolumeControl'
import ScheduleList from '@/components/ScheduleList'
import iconLarge from '@/assets/icon_large.png'
import { getCurrentTime, entryStart, videoDurationSeconds, getLiveEntry, formatTime, getVideoURL, getThumbnailURL } from '@/utils'
import { scheduleAtom } from '@/atoms'

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
