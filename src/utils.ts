import type { Schedule, ScheduleEntry, Video } from "@/types";

export function entryStart(entry: ScheduleEntry): Date {
  const startTime = new Date(entry.start);
  if (Number.isNaN(startTime.getTime())) {
    throw new Error(`Invalid start time format: ${entry.start}`);
  }
  return startTime;
}

export function entryEnd(entry: ScheduleEntry): Date {
  const startTime = entryStart(entry);
  const duration = videoDurationSeconds(entry.video);
  return new Date(startTime.getTime() + duration * 1000);
}

export function scheduleEnd(schedule: Schedule): Date {
  const lastEntry = schedule.entries[schedule.entries.length - 1];
  if (!lastEntry) {
    throw new Error("Schedule is empty");
  }
  return entryEnd(lastEntry);
}

export function videoDurationSeconds(video: Video): number {
  const duration = video.duration;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2] || "0", 10);
  const seconds = Number.parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function getCurrentTime(): Date {
  const now = new Date();
  return now;
}

export function isLiveEntry(entry: ScheduleEntry): boolean {
  const startTime = entryStart(entry);
  const videoDuration = videoDurationSeconds(entry.video);
  const endTime = new Date(startTime.getTime() + videoDuration * 1000);
  const currentTime = getCurrentTime();
  return currentTime >= startTime && currentTime <= endTime;
}

export function getLiveEntry(schedule: Schedule): ScheduleEntry | null {
  const liveEntry = schedule.entries.find(isLiveEntry);
  return liveEntry || null;
}

export function getLiveVideoElapsedSeconds(liveEntry: ScheduleEntry): number {
  const startTime = entryStart(liveEntry);
  const currentTime = getCurrentTime();
  return (currentTime.getTime() - startTime.getTime()) / 1000;
}

export function getVideoURL(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getThumbnailURL(
  videoId: string,
  res?: "maxresdefault" | "hqdefault" | "sddefault" | "mqdefault" | "default",
): string {
  return `https://i.ytimg.com/vi/${videoId}/${res ?? "maxresdefault"}.jpg`;
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours > 0 ? `${hours}:` : ""}${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatDate(date: Date): string {
  const month = date.getMonth() + 1;
  const dt = date.getDate();
  const hours = `0${date.getHours()}`.slice(-2);
  const minutes = `0${date.getMinutes()}`.slice(-2);
  return `${month}/${dt}  ${hours}:${minutes}`;
}
