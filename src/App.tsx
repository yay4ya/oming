import React from 'react'
import YouTube, { type YouTubeEvent, type YouTubePlayer } from 'react-youtube'
import { useAtom } from 'jotai'

import { useInterval } from '@/hooks'
import VolumeControl from '@/components/VolumeControl'
import ScheduleList from '@/components/ScheduleList'
import About from '@/components/About'
import { type ScheduleEntry } from '@/types'
import { videoDurationSeconds, getLiveEntry, formatTime, getVideoURL, getThumbnailURL, getLiveVideoElapsedSeconds } from '@/utils'
import { scheduleAtom } from '@/atoms'

function App() {
  const [schedule, refreshSchedule] = useAtom(scheduleAtom)
  const [liveEntry, setLiveEntry] = React.useState<ScheduleEntry>()
  const [videoTime, setVideoTime] = React.useState(0)
  const playerRef = React.useRef<YouTubePlayer | null>(null)

  React.useEffect(() => {
    const liveEntry = getLiveEntry(schedule)
    if (liveEntry) {
      setLiveEntry(liveEntry)
    }
  }, [schedule])

  const syncVideoTime = React.useCallback((player: YouTubePlayer) => {
    if (!liveEntry) return
    const duration = player.getDuration()
    const elapsedSeconds = getLiveVideoElapsedSeconds(liveEntry)
    if (elapsedSeconds > duration) {
      refreshSchedule()
    } else if (Math.abs(player.getCurrentTime() - elapsedSeconds) > 1) {
      player.seekTo(elapsedSeconds)
    }
  }, [liveEntry, refreshSchedule])

  const handleVideoReady = React.useCallback((event: YouTubeEvent) => {
    const player = event.target
    playerRef.current = player
    if (liveEntry) {
      player.loadVideoById({
        videoId: liveEntry.video.id,
        startSeconds: getLiveVideoElapsedSeconds(liveEntry),
      })
    }
    syncVideoTime(player)
  }, [liveEntry])

  const handleVideoPlay = React.useCallback((event: YouTubeEvent) => {
    const player = event.target
    syncVideoTime(player)
  }, [syncVideoTime])

  const handleVideoPause = React.useCallback((_event: YouTubeEvent) => {
    // const player = event.target
    // syncVideoTime(player)
  }, [])

  const handleVideoEnd = React.useCallback((event: YouTubeEvent) => {
    refreshSchedule().then(() => {
      const player = event.target
      syncVideoTime(player)
    }).catch((error) => {
      console.error('Failed to refresh schedule:', error)
    })
  }, [refreshSchedule])

  useInterval(() => {
    setVideoTime(playerRef.current?.getCurrentTime() ?? 0)
  }, 500);

  React.useEffect(() => {
    if (!liveEntry || !playerRef.current) return
    const liveTime = getLiveVideoElapsedSeconds(liveEntry)
    if (Math.abs(videoTime - liveTime) > 60) {
      syncVideoTime(playerRef.current)
    }
  }, [videoTime])

  return (
    <>
      <div className="w-screen h-screen overflow-hidden flex items-center justify-center">
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
                className="shrink-0 h-16 w-full flex items-center justify-start rounded-lg m-auto p-4 shadow-2xl bg-white/40 border border-white/40 text-gray-700 gap-4"
                style={{ maxWidth: 'calc((100vh - 7rem) * 16 / 9)' }}

              >
                <About className="w-12 h-12 shrink-0" />
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
