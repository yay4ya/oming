export interface Video {
  id: string;
  title: string;
  duration: string;
}

export interface ScheduleEntry {
  id: string;
  video: Video;
  start: string;
}

export interface Schedule {
  entries: ScheduleEntry[];
}
