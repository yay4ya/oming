import { useAtom } from "jotai";
import React from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";

import { scheduleAtom } from "@/atoms";
import About from "@/components/About";
import ScheduleList, { type ScheduleListHandler } from "@/components/ScheduleList";
import SchedulePopup from "@/components/SchedulePopup";
import VolumeControl from "@/components/VolumeControl";
import { useInterval } from "@/hooks";
import type { ScheduleEntry } from "@/types";
import {
  formatTime,
  getLiveEntry,
  getLiveVideoElapsedSeconds,
  getThumbnailURL,
  getVideoURL,
  videoDurationSeconds,
} from "@/utils";

function App() {
  const [schedule, refreshSchedule] = useAtom(scheduleAtom);
  const [liveEntry, setLiveEntry] = React.useState<ScheduleEntry>();
  const [videoTime, setVideoTime] = React.useState(0);
  const playerRef = React.useRef<YouTubePlayer | null>(null);
  const listRef = React.useRef<ScheduleListHandler>(null);

  React.useEffect(() => {
    const liveEntry = getLiveEntry(schedule);
    if (liveEntry) {
      setLiveEntry(liveEntry);
      listRef.current?.scrollIntoView();
    }
  }, [schedule]);

  React.useEffect(() => {
    if (playerRef.current && liveEntry) {
      playerRef.current.loadVideoById({
        videoId: liveEntry.video.id,
        startSeconds: getLiveVideoElapsedSeconds(liveEntry),
      });
      syncVideoTime(playerRef.current);
    }
  }, [liveEntry]);

  const syncVideoTime = React.useCallback(
    (player: YouTubePlayer) => {
      if (!liveEntry) return;
      const duration = player.getDuration();
      const elapsedSeconds = getLiveVideoElapsedSeconds(liveEntry);
      if (elapsedSeconds > duration) {
        refreshSchedule()
          .then(() => {
            const newLiveEntry = getLiveEntry(schedule);
            if (newLiveEntry) {
              setLiveEntry(newLiveEntry);
            }
          })
          .catch((error) => {
            console.error("Failed to refresh schedule:", error);
          });
      } else if (Math.abs(player.getCurrentTime() - elapsedSeconds) > 1) {
        player.seekTo(elapsedSeconds);
      }
    },
    [schedule, liveEntry, refreshSchedule],
  );

  const handleVideoReady = React.useCallback(
    (event: YouTubeEvent) => {
      const player = event.target;
      playerRef.current = player;
      if (liveEntry) {
        player.loadVideoById({
          videoId: liveEntry.video.id,
          startSeconds: getLiveVideoElapsedSeconds(liveEntry),
        });
        listRef.current?.scrollIntoView();
      }
      syncVideoTime(player);
    },
    [liveEntry, syncVideoTime],
  );

  const handleVideoPlay = React.useCallback(
    (event: YouTubeEvent) => {
      const player = event.target;
      syncVideoTime(player);
    },
    [syncVideoTime],
  );

  const handleVideoPause = React.useCallback((_event: YouTubeEvent) => {
    // const player = event.target
    // syncVideoTime(player)
  }, []);

  const handleVideoEnd = React.useCallback(
    (event: YouTubeEvent) => {
      refreshSchedule()
        .then(() => {
          const player = event.target;
          syncVideoTime(player);
        })
        .catch((error) => {
          console.error("Failed to refresh schedule:", error);
        });
    },
    [refreshSchedule, syncVideoTime],
  );

  useInterval(() => {
    setVideoTime(playerRef.current?.getCurrentTime() ?? 0);
  }, 500);

  React.useEffect(() => {
    if (!liveEntry || !playerRef.current) return;
    const liveTime = getLiveVideoElapsedSeconds(liveEntry);
    if (Math.abs(videoTime - liveTime) > 60) {
      syncVideoTime(playerRef.current);
    }
  }, [liveEntry, videoTime, syncVideoTime]);

  return (
    <>
      <div className="w-screen h-dvh overflow-x-hidden overflow-y-auto flex items-center justify-center">
        {liveEntry ? (
          <>
            <div className="absolute top-0 left-0 w-screen h-dvh z-[-1] opacity-40">
              <img
                className="object-cover w-full h-full blur-xl brightness-105"
                src={getThumbnailURL(liveEntry.video.id)}
                alt="Live stream thumbnail"
              />
            </div>
            <div className="w-full h-full max-h-full max-w-full flex flex-col p-4 gap-4 m-auto justify-between sm:justify-center">
              <div className="w-full aspect-video mx-auto" style={{ maxWidth: "calc((100vh - 7rem) * 16 / 9)" }}>
                <YouTube
                  className="w-full"
                  iframeClassName="w-full h-auto aspect-video rounded-xl m-auto shadow-2xl"
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
              <ScheduleList
                ref={listRef}
                schedule={schedule}
                className="relative overflow-y-auto sm:hidden grow min-h-[10rem]"
                onClick={() => listRef.current?.scrollIntoView()}
              />
              <div
                className="shrink-0 h-16 w-full flex items-center justify-start rounded-lg mx-auto p-4 shadow-2xl bg-white/40 border border-white/40 text-gray-700 gap-4"
                style={{ maxWidth: "calc((100vh - 7rem) * 16 / 9)" }}
              >
                <About className="w-12 h-12 shrink-0" />
                <a
                  href={getVideoURL(liveEntry.video.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-1"
                >
                  {liveEntry.video.title}
                </a>
                <div className="flex-1 flex items-center justify-end gap-8">
                  <p className="text-gray-500 mr-1 text-sm text-nowrap w-fit shrink-0 md:block hidden">
                    {formatTime(videoTime)} / {formatTime(videoDurationSeconds(liveEntry.video))}
                  </p>
                  <VolumeControl player={playerRef.current} className="w-6 h-6" />
                  <SchedulePopup className="w-6 h-6 hidden sm:block" schedule={schedule} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <p>No live stream currently.</p>
        )}
      </div>
    </>
  );
}

export default App;
